import { json, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ url, locals }) => {
    const { profile } = locals; // This is where we'd get the user's role and college_id

    // If no user or profile, return no results
    if (!profile) {
        return json({ results: {} });
    }

    const query = url.searchParams.get('q')?.toLowerCase() || '';

    // Simulate a delay for fetching data
    await new Promise(resolve => setTimeout(resolve, 300));

    // Placeholder for actual database queries based on 'profile' and 'query'
    // In a real implementation, you'd perform secure, role-based SQL queries here
    // For now, we'll return dummy data filtered by the query

    const dummyInstructors = [
        { id: 'inst1', name: 'Dr. John Doe', college_id: 1 },
        { id: 'inst2', name: 'Dr. Jane Smith', college_id: 1 },
        { id: 'inst3', name: 'Prof. Alice Johnson', college_id: 2 }
    ];

    const dummySubjects = [
        { id: 'sub1', code: 'CS101', name: 'Intro to Programming', college_id: 1 },
        { id: 'sub2', code: 'MA201', name: 'Calculus I', college_id: 1 },
        { id: 'sub3', code: 'PH100', name: 'Intro to Philosophy', college_id: 2 }
    ];

    // Filter dummy data based on query and simulated profile
    const filteredInstructors = dummyInstructors.filter(
        (i) => i.name.toLowerCase().includes(query) //&& i.college_id === profile.college_id // Uncomment for real filtering
    );

    const filteredSubjects = dummySubjects.filter(
        (s) => (s.code.toLowerCase().includes(query) || s.name.toLowerCase().includes(query)) //&& s.college_id === profile.college_id // Uncomment for real filtering
    );


    return json({
        results: {
            instructors: filteredInstructors,
            subjects: filteredSubjects,
            // Add other categories like rooms, blocks, etc. here
        },
    });
};
