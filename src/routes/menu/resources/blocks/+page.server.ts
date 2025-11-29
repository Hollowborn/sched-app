import { fail, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

const ALLOWED_ROLES = ['Admin', 'Registrar', 'Chairperson'];

// --- LOAD FUNCTION ---
export const load: PageServerLoad = async ({ locals }) => {
	const userRole = locals.profile?.role;
	if (!userRole || !ALLOWED_ROLES.includes(userRole)) {
		throw error(403, 'Forbidden: You do not have permission to access this page.');
	}

	const [blocksRes, programsRes] = await Promise.all([
		locals.supabase.from('blocks').select(`*, programs ( program_name )`).order('block_name'),
		locals.supabase.from('programs').select(`id, program_name`).order('program_name')
	]);

	if (blocksRes.error || programsRes.error) {
		console.error('Error fetching data:', blocksRes.error || programsRes.error);
		throw error(500, 'Failed to load necessary resources from the database.');
	}

	return {
		blocks: blocksRes.data,
		programs: programsRes.data,
		profile: locals.profile
	};
};

// --- ACTIONS ---
export const actions: Actions = {
	// --- BLOCK ACTIONS ---
	generateBlocks: async ({ request, locals }) => {
		if (!ALLOWED_ROLES.includes(locals.profile?.role || '')) {
			return fail(403, {
				message: 'Forbidden: You do not have permission to perform this action.'
			});
		}
		const formData = await request.formData();
		const program_id = Number(formData.get('program_id'));
		const year_levels = formData.getAll('year_level').map(Number); // Get all selected year levels
		const count = Number(formData.get('count'));
		const prefix = formData.get('prefix')?.toString()?.trim() || '';

		if (!program_id || year_levels.length === 0 || !count) {
			return fail(400, { message: 'Program, at least one year level, and count are required.' });
		}

		const newBlocks = [];
		// Generate blocks for each year level
		for (const year_level of year_levels) {
			for (let i = 0; i < count; i++) {
				const suffix = String.fromCharCode(65 + i); // A, B, C...
				newBlocks.push({
					program_id,
					year_level,
					// Example: "BSCS1A" for BS Computer Science, Year 1, Block A
					block_name: `${prefix}${year_level}${suffix}`
				});
			}
		}

		// Check for existing blocks before inserting
		const { data: existingBlocks, error: checkError } = await locals.supabase
			.from('blocks')
			.select('block_name')
			.eq('program_id', program_id)
			.in(
				'block_name',
				newBlocks.map((b) => b.block_name)
			);

		if (existingBlocks?.length > 0) {
			return fail(409, {
				message: `Some blocks already exist: ${existingBlocks.map((b) => b.block_name).join(', ')}`
			});
		}

		const { error: insertError } = await locals.supabase.from('blocks').insert(newBlocks);

		if (insertError) {
			console.error('Block generation error:', insertError);
			return fail(500, { message: 'Failed to generate blocks.' });
		}

		return {
			status: 201,
			message: `${newBlocks.length} blocks generated successfully across ${year_levels.length} year level(s).`,
			action: 'generateBlocks'
		};
	},

	deleteBlock: async ({ request, locals }) => {
		if (locals.profile?.role !== 'Admin') {
			return fail(403, { message: 'Forbidden: You do not have permission to delete blocks.' });
		}
		const formData = await request.formData();
		const id = formData.get('id');
		const ids = formData.get('ids');

		// Handle bulk delete if ids is provided
		if (ids) {
			const blockIds = ids.toString().split(',').map(Number).filter(Boolean);
			if (blockIds.length === 0) {
				return fail(400, { message: 'No valid block IDs provided.' });
			}

			const { error: deleteError } = await locals.supabase
				.from('blocks')
				.delete()
				.in('id', blockIds);

			if (deleteError) {
				return fail(500, {
					message: 'Failed to delete blocks. They may be used in class offerings.'
				});
			}
			return {
				status: 200,
				message: `Successfully deleted ${blockIds.length} block(s).`,
				action: 'deleteBlock'
			};
		}

		// Handle single delete if id is provided
		if (!id) {
			return fail(400, { message: 'Invalid block ID.' });
		}

		const blockId = Number(id);
		if (!blockId) {
			return fail(400, { message: 'Invalid block ID format.' });
		}

		const { error: deleteError } = await locals.supabase.from('blocks').delete().eq('id', blockId);

		if (deleteError) {
			return fail(500, {
				message: 'Failed to delete block. It may be used in class offerings.'
			});
		}
		return {
			status: 200,
			message: 'Block deleted successfully.',
			action: 'deleteBlock'
		};
	}
};
