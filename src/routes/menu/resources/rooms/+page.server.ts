import { fail, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

// This page is primarily for Admins and Registrars who manage university-wide resources.
const ALLOWED_ROLES = ['Admin', 'Registrar', 'Chairperson'];

// --- LOAD FUNCTION ---
export const load: PageServerLoad = async ({ locals }) => {
	const userRole = locals.profile?.role;
	if (!userRole || !ALLOWED_ROLES.includes(userRole)) {
		throw error(403, 'Forbidden: You do not have permission to access this page.');
	}

	const [{ data: rooms, error: roomsError }, { data: colleges, error: collegesError }] =
		await Promise.all([
			locals.supabase.from('rooms').select('*, colleges(college_name)'),
			locals.supabase.from('colleges').select('*')
		]);

	if (roomsError || collegesError) {
		console.error('Error fetching rooms or colleges:', roomsError || collegesError);
		throw error(500, 'Failed to load room data.');
	}

	return {
		rooms: rooms || [],
		colleges: colleges || [],
		profile: locals.profile
	};
};

// --- ACTIONS ---
export const actions: Actions = {
	createRoom: async ({ request, locals }) => {
		if (locals.profile?.role !== 'Admin') {
			return fail(403, { message: 'Forbidden: Only Admins can create new rooms.' });
		}

		const formData = await request.formData();
		const room_name = formData.get('room_name')?.toString()?.trim();
		const building = formData.get('building')?.toString()?.trim();
		const capacity = Number(formData.get('capacity'));
		const type = formData.get('type')?.toString();
		const owner_college_id = formData.get('owner_college_id')
			? Number(formData.get('owner_college_id'))
			: null;
		const is_general_use = formData.get('is_general_use') === 'on';
		const features = formData.getAll('features').map(String); // Gets all checked features

		if (!room_name || !capacity || !type) {
			return fail(400, { message: 'Room Name, Capacity, and Type are required.' });
		}

		const { error: insertError } = await locals.supabase.from('rooms').insert({
			room_name,
			building,
			capacity,
			type,
			owner_college_id,
			is_general_use,
			features
		});

		if (insertError) {
			console.error('Error creating room:', insertError);
			return fail(500, { message: 'Failed to create room.' });
		}

		return { message: 'Room created successfully.' };
	},

	updateRoom: async ({ request, locals }) => {
		if (locals.profile?.role !== 'Admin') {
			return fail(403, { message: 'Forbidden: Only Admins can update rooms.' });
		}
		const formData = await request.formData();
		const id = Number(formData.get('id'));
		const room_name = formData.get('room_name')?.toString()?.trim();
		const building = formData.get('building')?.toString()?.trim();
		const capacity = Number(formData.get('capacity'));
		const type = formData.get('type')?.toString();
		const owner_college_id = formData.get('owner_college_id')
			? Number(formData.get('owner_college_id'))
			: null;
		const is_general_use = formData.get('is_general_use') === 'on';
		const features = formData.getAll('features').map(String);

		if (!id || !room_name || !capacity || !type) {
			return fail(400, { message: 'All required fields must be filled.' });
		}

		const { error: updateError } = await locals.supabase
			.from('rooms')
			.update({
				room_name,
				building,
				capacity,
				type,
				owner_college_id,
				is_general_use,
				features
			})
			.eq('id', id);

		if (updateError) {
			console.error('Error updating room:', updateError);
			return fail(500, { message: 'Failed to update room.' });
		}

		return { message: 'Room updated successfully.' };
	},

	deleteRoom: async ({ request, locals }) => {
		if (locals.profile?.role !== 'Admin') {
			return fail(403, { message: 'Forbidden: Only Admins can delete rooms.' });
		}
		const formData = await request.formData();
		const id = Number(formData.get('id'));
		if (!id) return fail(400, { message: 'Invalid Room ID.' });

		const { error: deleteError } = await locals.supabase.from('rooms').delete().eq('id', id);

		if (deleteError) {
			console.error('Error deleting room:', deleteError);
			return fail(500, { message: 'Failed to delete room. It might be in use in a schedule.' });
		}

		return { message: 'Room deleted successfully.' };
	}
};
