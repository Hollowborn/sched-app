export type Schema = {
	id: string;
	header: string;
	type: string;
	status: 'Done' | 'In Progress' | 'Not Started';
	target: number;
	limit: number;
	reviewer: string;
};
