import { supabase } from '$lib/supabaseClients';

export async function load() {
	const { data, error } = await supabase.from('instructors').select();
	if (error) {
		console.error('Supabase error:', error);
	} else {
		console.log(`Supa success`);
	}

	// console.log(supabase.supabaseUrl + '\n ' + supabase.supabaseKey);
	// console.log('data: ' + data);

	return {
		instructors: data ?? []
	};
}
