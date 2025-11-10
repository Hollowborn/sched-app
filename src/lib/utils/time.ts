// A simple helper to generate time slots for the grid
export function generateTimeSlots(start: string, end: string, interval: number): string[] {
	const slots: string[] = [];
	let [hour, minute] = start.split(':').map(Number);
	const [endHour, endMinute] = end.split(':').map(Number);
	const endTime = endHour * 60 + endMinute;

	let currentTime = hour * 60 + minute;

	while (currentTime < endTime) {
		const h = Math.floor(currentTime / 60)
			.toString()
			.padStart(2, '0');
		const m = (currentTime % 60).toString().padStart(2, '0');
		slots.push(`${h}:${m}`);
		currentTime += interval;
	}
	return slots;
}

// A helper to calculate row spans for the grid
export function calculateRowSpan(startTime: string, endTime: string, interval: number): number {
	try {
		const [startH, startM] = startTime.split(':').map(Number);
		const [endH, endM] = endTime.split(':').map(Number);

		const startTotalMinutes = startH * 60 + startM;
		const endTotalMinutes = endH * 60 + endM;

		const duration = endTotalMinutes - startTotalMinutes;
		return Math.max(1, duration / interval); // Returns the number of 30-min blocks
	} catch (e) {
		return 1;
	}
}
