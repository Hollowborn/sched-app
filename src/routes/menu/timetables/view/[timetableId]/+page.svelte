<script lang="ts">
	import type { PageData } from './$types';

	import { generateTimeSlots } from '$lib/utils/time';
	import { SvelteMap } from 'svelte/reactivity';

	// Libs for export
	import jsPDF from 'jspdf';
	import autoTable from 'jspdf-autotable';
	import html2canvas from 'html2canvas';
	import * as XLSX from 'xlsx';
	import PizZip from 'pizzip';
	import Docxtemplater from 'docxtemplater';
	import { saveAs } from 'file-saver';
	import {
		Document,
		Paragraph,
		Table as Tablex,
		TableRow,
		TableCell,
		WidthType,
		TextRun,
		VerticalMergeType,
		AlignmentType,
		HeadingLevel,
		ShadingType,
		Packer
	} from 'docx';
	import { toast } from 'svelte-sonner';

	import DataTable from '$lib/components/data-table/data-table.svelte';
	import type { ColumnDef } from '@tanstack/table-core';
	import { renderSnippet } from '$lib/components/ui/data-table';

	import {
		ChevronLeft,
		ChevronRight,
		FileDown,
		Users,
		DoorOpen,
		User as UserIcon,
		Building,
		ClockFading,
		CircleCheck,
		UserCheck,
		Grid2X2Check,
		MapPinCheck
	} from '@lucide/svelte';
	import * as Select from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import Spinner from '$lib/components/ui/spinner/spinner.svelte';

	interface GenerationMetadata {
		status: 'Generating' | 'Completed';
		successRate: number;
		scheduledCount: number;
		totalClasses: number;
		timeTakenSec: string;
		failedClasses: { class: string; reason: string }[];
		generation_params?: {
			algorithm: string;
			academic_year: string;
			semester: string;
			scheduleStartTime: string;
			scheduleEndTime: string;
			breakTime: string;
			constraints: {
				enforceCapacity: boolean;
				enforceInstructor: boolean;
				enforceBlock: boolean;
				roomTypeConstraint: 'strict' | 'soft' | 'off';
				excludedDays: string[];
			};
		};
		roomsUsed: number;
		algorithm: string;
	}

	let { data } = $props<{ data: PageData }>();

	// --- State ---
	let viewBy = $state<'room' | 'instructor' | 'block'>('room');
	let currentItemIndex = $state(0);
	let isExporting = $state(false);

	// --- Time Grid Setup ---
	const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
	const timeInterval = 60; // 1-hour intervals
	const timeSlots = $state(generateTimeSlots('07:00', '21:00', timeInterval));
	const rowHeight = 64; // px per hour

	// --- Color Generation ---
	const colorPalette = ['--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5'];

	function generateColorFromString(str: string): string {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			hash = str.charCodeAt(i) + ((hash << 5) - hash);
		}
		const index = Math.abs(hash % colorPalette.length);
		return colorPalette[index];
	}

	// --- Export Logic ---
	async function exportAsPDF() {
		if (isExporting) return;
		isExporting = true;

		const elementToPrint = document.getElementById(`${viewMode}-view-content`);
		if (!elementToPrint) {
			console.error('Printable element not found for view:', viewMode);
			isExporting = false;
			return;
		}

		// OKLCH to RGB conversion for html2canvas
		const originalStyles = new SvelteMap<
			HTMLElement,
			{ backgroundColor: string; color: string; borderLeftColor: string }
		>();
		const elementsToProcess = elementToPrint.querySelectorAll('.schedule-item-cell');

		try {
			// Pre-process: Apply computed styles as inline styles
			elementsToProcess.forEach((el) => {
				const element = el as HTMLElement;
				const computedStyle = window.getComputedStyle(element);
				const original = {
					backgroundColor: element.style.backgroundColor,
					color: element.style.color,
					borderLeftColor: element.style.borderLeftColor
				};
				originalStyles.set(element, original);

				element.style.backgroundColor = computedStyle.backgroundColor;
				element.style.color = computedStyle.color;
				element.style.borderLeftColor = computedStyle.borderLeftColor;
			});

			const doc = new jsPDF({
				orientation: 'p',
				unit: 'mm',
				format: 'a4'
			});

			const title = `${data.timetable.name} - ${data.timetable.academic_year}, ${data.timetable.semester}`;
			doc.text(title, 14, 15);

			let viewTitle = '';
			if (currentItem && (viewMode === 'grid' || viewMode === 'transposed')) {
				switch (viewBy) {
					case 'room':
						viewTitle = `View by Room: ${currentItem.room_name}`;
						break;
					case 'instructor':
						viewTitle = `View by Instructor: ${currentItem.name}`;
						break;
					case 'block':
						viewTitle = `View by Block: ${currentItem.block_name}`;
						break;
				}
			}

			if (viewMode === 'list' || viewMode === 'agenda') {
				const head = [['Time', 'Day', 'Subject', 'Block', 'Instructor', 'Room']];
				const body = listFilteredSchedule.map((item) => [
					`${item.start_time.substring(0, 5)} - ${item.end_time.substring(0, 5)}`,
					item.day_of_week,
					`${item.classes.subjects.subject_name} (${item.classes.subjects.subject_code})`,
					item.classes.blocks.block_name,
					item.classes.instructors?.name || 'N/A',
					item.rooms.room_name
				]);

				autoTable(doc, {
					head: head,
					body: body,
					startY: 20,
					styles: { fontSize: 8 },
					headStyles: { fillColor: [38, 38, 38] }
				});
			} else {
				if (viewTitle) doc.text(viewTitle, 14, 22);

				const canvas = await html2canvas(elementToPrint, {
					scale: 2,
					useCORS: true,
					backgroundColor: null
				});
				const imgData = canvas.toDataURL('image/png');

				const imgProps = doc.getImageProperties(imgData);
				const pdfWidth = doc.internal.pageSize.getWidth() - 28;
				const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
				doc.addImage(imgData, 'PNG', 14, 28, pdfWidth, pdfHeight);
			}

			doc.save(`${data.timetable.name}_${viewMode}.pdf`);
		} catch (error) {
			console.error('Error exporting PDF:', error);
		} finally {
			// Post-process: Restore original styles
			elementsToProcess.forEach((el) => {
				const element = el as HTMLElement;
				const original = originalStyles.get(element);
				if (original) {
					element.style.backgroundColor = original.backgroundColor;
					element.style.color = original.color;
					element.style.borderLeftColor = original.borderLeftColor;
				}
			});
			isExporting = false;
		}
	}

	function exportAsExcel() {
		if (isExporting) return;
		isExporting = true;
		try {
			const dataToExport = listFilteredSchedule.map((item) => ({
				Subject: item.classes.subjects.subject_name,
				'Subject Code': item.classes.subjects.subject_code,
				'Course Type': item.course_type,
				Block: item.classes.blocks.block_name,
				Instructor: item.classes.instructors?.name || 'Unassigned',
				Room: item.rooms.room_name,
				Day: item.day_of_week,
				'Start Time': item.start_time.substring(0, 5),
				'End Time': item.end_time.substring(0, 5)
			}));

			const worksheet = XLSX.utils.json_to_sheet(dataToExport);
			const workbook = XLSX.utils.book_new();
			XLSX.utils.book_append_sheet(workbook, worksheet, 'Schedule');

			const objectMaxLength = Object.keys(dataToExport[0] || {}).map((key) => ({
				wch: Math.max(
					key.length,
					...dataToExport.map((row) => (row[key] ? row[key].toString().length : 0))
				)
			}));
			worksheet['!cols'] = objectMaxLength;

			XLSX.writeFile(workbook, `${data.timetable.name}_schedule.xlsx`);
		} catch (error) {
			console.error('Error exporting Excel:', error);
		} finally {
			isExporting = false;
		}
	}

	async function exportAsDOCX() {
		if (isExporting) return;

		// Validations
		if (viewBy !== 'instructor' || !currentItem) {
			alert('Please select an Instructor view to export a workload document.');
			return;
		}

		isExporting = true;

		try {
			// 1. Prepare Data
			// Filter schedules for this instructor
			const instructorSchedules = data.schedules.filter(
				(s) => s.classes.instructor_id === currentItem.id
			);

			// Group by Subject Code + Block
			const groupedCourses = new Map<string, any[]>();
			instructorSchedules.forEach((s) => {
				const key = `${s.classes.subjects.subject_code}-${s.classes.blocks.block_name}`;
				if (!groupedCourses.has(key)) {
					groupedCourses.set(key, []);
				}
				groupedCourses.get(key).push(s);
			});

			// Transform to template format
			const coursesData = Array.from(groupedCourses.values()).map((group) => {
				// Sort entries within the group by day/time
				group.sort((a, b) => {
					const dayOrder = {
						Monday: 1,
						Tuesday: 2,
						Wednesday: 3,
						Thursday: 4,
						Friday: 5,
						Saturday: 6,
						Sunday: 7
					};
					const dDiff = (dayOrder[a.day_of_week] || 99) - (dayOrder[b.day_of_week] || 99);
					if (dDiff !== 0) return dDiff;
					return a.start_time.localeCompare(b.start_time);
				});

				const totalHours = group.reduce((sum, s) => {
					const lec = s.classes.subjects.lecture_hours || 0;
					const lab = s.classes.subjects.lab_hours || 0;
					return sum + lec + lab;
				}, 0);

				const first = group[0];

				return {
					subject_code: first.classes.subjects.subject_code,
					subject_title: first.classes.subjects.subject_name.replace(/&/g, '&amp;'),
					block: first.classes.blocks.block_name,
					units_lec: first.classes.subjects.lecture_hours || 0,
					units_lab: first.classes.subjects.lab_hours || 0,
					num_hours: first.classes.subjects.lecture_hours + first.classes.subjects.lab_hours || 0,
					// Join details with newlines
					day: group.map((s) => s.day_of_week.substring(0, 3)).join(',\n'),
					time: group
						.map((s) => `${s.start_time.substring(0, 5)} - ${s.end_time.substring(0, 5)}`)
						.join('\n'),
					room: group.map((s) => s.rooms.room_name).join(',\n')
				};
			});

			// Map to template structure
			const templateData = {
				instructor_name: currentItem.name,
				academic_year: data.timetable.academic_year,
				semester: data.timetable.semester,
				college: currentItem.colleges?.college_name || 'N/A',
				courses: coursesData.sort((a, b) => a.subject_code.localeCompare(b.subject_code))
			};

			// 2. Load Template
			const response = await fetch('/templates/workload_template.docx');
			if (!response.ok) {
				throw new Error(`Could not find template: ${response.statusText}`);
			}
			const content = await response.arrayBuffer();

			const zip = new PizZip(content);
			const doc = new Docxtemplater(zip, {
				paragraphLoop: true,
				linebreaks: true
			});

			// 3. Render
			doc.render(templateData);

			// 4. Output
			const out = doc.getZip().generate({
				type: 'blob',
				mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
			});

			// 5. Save
			toast.success('Workload exported successfully!');
			saveAs(out, `Workload_${currentItem.name.replace(/ /g, '_')}.docx`);
		} catch (error) {
			console.error('Error in export DOCX:', error);
			toast.error('Error generating document. Please check console for details.');
		} finally {
			isExporting = false;
		}
	}

	// --- Room Schedule Grid Export (Template-based) ---
	async function exportRoomScheduleDOCX() {
		if (isExporting) return;
		isExporting = true;

		try {
			// --- Helpers ---
			const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
			const SLOT_MINUTES = 30;
			const DAY_START = '08:00';
			const DAY_END = '19:00';

			const toMinutes = (t: string) => {
				const [h, m] = t.split(':').map(Number);
				return h * 60 + m;
			};
			const toTimeStr = (mins: number) => {
				const totalH = Math.floor(mins / 60);
				const m = (mins % 60).toString().padStart(2, '0');
				const period = totalH < 12 ? 'AM' : 'PM';
				const h = totalH % 12 === 0 ? 12 : totalH % 12;
				return `${h}:${m} ${period}`;
			};
			const xmlEscape = (s: string) =>
				s
					.replace(/&/g, '&amp;')
					.replace(/</g, '&lt;')
					.replace(/>/g, '&gt;')
					.replace(/"/g, '&quot;');

			const startMins = toMinutes(DAY_START);
			const endMins = toMinutes(DAY_END);
			const slotCount = (endMins - startMins) / SLOT_MINUTES;
			const slots: string[] = [];
			for (let i = 0; i < slotCount; i++) slots.push(toTimeStr(startMins + i * SLOT_MINUTES));

			// --- Group schedules by room ---
			const schedulesByRoom = new Map<number, typeof data.schedules>();
			data.schedules.forEach((s) => {
				if (!schedulesByRoom.has(s.room_id)) schedulesByRoom.set(s.room_id, []);
				schedulesByRoom.get(s.room_id)!.push(s);
			});

			if (schedulesByRoom.size === 0) {
				toast.warning('No scheduled classes found to export.');
				return;
			}

			// --- Load template ---
			const response = await fetch('/templates/utilization_template.docx');
			if (!response.ok) throw new Error(`Could not load template: ${response.statusText}`);
			const templateBuffer = await response.arrayBuffer();
			const zip = new PizZip(templateBuffer);

			// --- OOXML helper builders ---
			const wPr = (xml: string) => `<w:tcPr>${xml}</w:tcPr>`;

			// Cell shading
			const shading = (fill: string) => `<w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>`;

			// Cell width (dxa units, 9072 = ~100% of A4 landscape body)
			// 6 columns: Time=8%, Days=18.4% each -> use pct (5000ths of 100%)
			const timeCellW = 800; // 8%
			const dayCellW = 1840; // ~18.4%

			// Build a single w:tc (table cell) OOXML string
			function makeCell(
				content: string,
				opts: {
					fill?: string;
					bold?: boolean;
					pct?: number;
					vMerge?: 'restart' | 'continue';
					center?: boolean;
					color?: string;
					italic?: boolean;
					fontSize?: number;
				} = {}
			) {
				const rPr = [
					opts.bold ? '<w:b/>' : '',
					opts.italic ? '<w:i/>' : '',
					opts.color ? `<w:color w:val="${opts.color}"/>` : '',
					opts.fontSize ? `<w:sz w:val="${opts.fontSize}"/><w:szCs w:val="${opts.fontSize}"/>` : ''
				]
					.filter(Boolean)
					.join('');

				const para = `<w:p><w:pPr>${opts.center ? '<w:jc w:val="center"/>' : ''}</w:pPr><w:r>${rPr ? `<w:rPr>${rPr}</w:rPr>` : ''}<w:t xml:space="preserve">${xmlEscape(content)}</w:t></w:r></w:p>`;

				const vMergeXml =
					opts.vMerge === 'restart'
						? '<w:vMerge w:val="restart"/>'
						: opts.vMerge === 'continue'
							? '<w:vMerge/>'
							: '';

				const tcPrInner = [
					opts.pct !== undefined
						? `<w:tcW w:w="${opts.pct}" w:type="pct"/>`
						: `<w:tcW w:w="0" w:type="auto"/>`,
					vMergeXml,
					opts.fill ? shading(opts.fill) : ''
				]
					.filter(Boolean)
					.join('');

				return `<w:tc>${wPr(tcPrInner)}${para}</w:tc>`;
			}

			// --- Build body XML ---
			let bodyXml = '';
			const rooms = Array.from(schedulesByRoom.entries());

			rooms.forEach(([, roomSchedules], roomIndex) => {
				const roomName = roomSchedules[0].rooms.room_name;

				// Build grid lookup: day -> slotIndex -> { entry, spanCount }
				type CellInfo = { entry: (typeof data.schedules)[0]; spanCount: number };
				const grid: Record<string, Record<number, CellInfo>> = {};
				DAYS.forEach((d) => (grid[d] = {}));

				roomSchedules.forEach((s) => {
					const si = (toMinutes(s.start_time.substring(0, 5)) - startMins) / SLOT_MINUTES;
					const ei = (toMinutes(s.end_time.substring(0, 5)) - startMins) / SLOT_MINUTES;
					const span = ei - si;
					if (span <= 0) return;
					grid[s.day_of_week][si] = { entry: s, spanCount: span };
					for (let i = 1; i < span; i++) {
						grid[s.day_of_week][si + i] = { entry: s, spanCount: -1 };
					}
				});

				// Room title paragraph
				bodyXml += `<w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t>${xmlEscape('Room: ' + roomName)}</w:t></w:r></w:p>`;
				bodyXml += `<w:p><w:r><w:rPr><w:color w:val="555555"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t>${xmlEscape(` ${data.timetable.academic_year}, ${data.timetable.semester}`)}</w:t></w:r></w:p>`;
				bodyXml += `<w:p/>`;

				// Table — use TableGrid style only, no custom border overrides
				bodyXml += `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="5000" w:type="pct"/></w:tblPr>`;

				// Header row
				bodyXml += `<w:tr><w:trPr><w:tblHeader/><w:trHeight w:val="280" w:hRule="atLeast"/></w:trPr>`;
				bodyXml += makeCell('Time', {
					fill: '1F3864',
					bold: true,
					color: 'FFFFFF',
					pct: timeCellW,
					center: true,
					fontSize: 16
				});
				DAYS.forEach((d) => {
					bodyXml += makeCell(d, {
						fill: '1F3864',
						bold: true,
						color: 'FFFFFF',
						pct: dayCellW,
						center: true,
						fontSize: 16
					});
				});
				bodyXml += `</w:tr>`;

				// Data rows
				slots.forEach((slotLabel, slotIdx) => {
					bodyXml += `<w:tr><w:trPr><w:trHeight w:val="280" w:hRule="atLeast"/></w:trPr>`;
					// Time column
					bodyXml += makeCell(slotLabel, {
						fill: 'F2F2F2',
						pct: timeCellW,
						center: true,
						fontSize: 14,
						color: '555555'
					});

					DAYS.forEach((day) => {
						const cell = grid[day][slotIdx];
						if (!cell) {
							bodyXml += makeCell('', { pct: dayCellW });
						} else if (cell.spanCount === -1) {
							bodyXml += makeCell('', { pct: dayCellW, vMerge: 'continue', fill: 'EEF2FF' });
						} else {
							const s = cell.entry;
							const subj = `${s.classes.subjects.subject_code} — ${s.classes.subjects.subject_name}`;
							const block = s.classes.blocks.block_name;
							const instr = s.classes.instructors?.name || 'Unassigned';

							// Multi-paragraph cell via manual XML for subject, block, instructor
							const rPrSubj = `<w:rPr><w:b/><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr>`;
							const rPrBlock = `<w:rPr><w:color w:val="444444"/><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr>`;
							const rPrInstr = `<w:rPr><w:i/><w:color w:val="777777"/><w:sz w:val="14"/><w:szCs w:val="14"/></w:rPr>`;
							const pCenter = `<w:pPr><w:jc w:val="center"/></w:pPr>`;

							const cellContent =
								`<w:p>${pCenter}<w:r>${rPrSubj}<w:t xml:space="preserve">${xmlEscape(subj)}</w:t></w:r></w:p>` +
								`<w:p>${pCenter}<w:r>${rPrBlock}<w:t xml:space="preserve">${xmlEscape(block)}</w:t></w:r></w:p>` +
								`<w:p>${pCenter}<w:r>${rPrInstr}<w:t xml:space="preserve">${xmlEscape(instr)}</w:t></w:r></w:p>`;

							const tcPr = wPr(
								`<w:tcW w:w="${dayCellW}" w:type="pct"/><w:vMerge w:val="restart"/>${shading('EEF2FF')}`
							);
							bodyXml += `<w:tc>${tcPr}${cellContent}</w:tc>`;
						}
					});

					bodyXml += `</w:tr>`;
				});

				bodyXml += `</w:tbl><w:p/>`;

				// Page break between rooms (except last)
				if (roomIndex < rooms.length - 1) {
					bodyXml += `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
				}
			});

			// --- Inject into template's document.xml ---
			const docXmlStr = zip.file('word/document.xml')!.asText();

			// Replace body content, keeping <w:sectPr> (page layout/header-footer refs) intact
			const sectPrMatch = docXmlStr.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/);
			const sectPr = sectPrMatch ? sectPrMatch[0] : '';

			const newDocXml = docXmlStr.replace(
				/<w:body>[\s\S]*<\/w:body>/,
				`<w:body>${bodyXml}${sectPr}</w:body>`
			);

			zip.file('word/document.xml', newDocXml);

			// --- Save ---
			const blob = zip.generate({
				type: 'blob',
				mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
			});
			saveAs(blob, `Room_Schedule_${data.timetable.name.replace(/ /g, '_')}.docx`);
			toast.success('Room schedule exported successfully!');
		} catch (error) {
			console.error('Error exporting room schedule:', error);
			toast.error('Error generating document. Please check the console.');
		} finally {
			isExporting = false;
		}
	}

	// --- Derived State (The core logic) ---

	const listSource = $derived.by(() => {
		switch (viewBy) {
			case 'room':
				return data.uniqueRooms;
			case 'instructor':
				return data.uniqueInstructors;
			case 'block':
				return data.uniqueBlocks;
			default:
				return [];
		}
	});

	const currentItem = $derived(listSource[currentItemIndex]);

	const gridHeader = $derived.by(() => {
		if (!currentItem) return { title: 'N/A', subtitle: '', badge: '' };
		switch (viewBy) {
			case 'room':
				return {
					icon: Building,
					title: currentItem.room_name,
					subtitle: currentItem.building || 'No building specified',
					badge: currentItem.type
				};
			case 'instructor':
				return {
					icon: UserIcon,
					title: currentItem.name,
					subtitle: currentItem.colleges?.college_name || 'N/A',
					badge: `Max Load: ${currentItem.max_load}`
				};
			case 'block':
				return {
					icon: Users,
					title: currentItem.block_name,
					subtitle: currentItem.programs?.program_name || 'N/A',
					badge: `Year: ${currentItem.year_level}`
				};
		}
	});

	const filteredSchedule = $derived.by(() => {
		if (!currentItem) return [];
		switch (viewBy) {
			case 'room':
				return data.schedules.filter((s) => s.room_id === currentItem.id);
			case 'instructor':
				return data.schedules.filter((s) => s.classes.instructor_id === currentItem.id);
			case 'block':
				return data.schedules.filter((s) => s.classes.block_id === currentItem.id);
			default:
				return [];
		}
	});

	const itemClassCounts = $derived.by(() => {
		const counts: Record<string, Set<number>> = {};

		data.schedules.forEach((s) => {
			const classId = s.classes.id;
			if (s.room_id) {
				const key = s.room_id.toString();
				if (!counts[key]) counts[key] = new Set();
				counts[key].add(classId);
			}
			if (s.classes.instructor_id) {
				const key = s.classes.instructor_id.toString();
				if (!counts[key]) counts[key] = new Set();
				counts[key].add(classId);
			}
			if (s.classes.block_id) {
				const key = s.classes.block_id.toString();
				if (!counts[key]) counts[key] = new Set();
				counts[key].add(classId);
			}
		});

		const result: Record<string, number> = {};
		for (const [key, set] of Object.entries(counts)) {
			result[key] = set.size;
		}
		return result;
	});

	// --- Navigation ---
	function goToNext() {
		if (listSource.length === 0) return;
		currentItemIndex = (currentItemIndex + 1) % listSource.length;
	}
	function goToPrev() {
		if (listSource.length === 0) return;
		currentItemIndex = (currentItemIndex - 1 + listSource.length) % listSource.length;
	}

	$effect(() => {
		currentItemIndex = 0;
	});

	// --- View Mode ---
	let viewMode: 'grid' | 'transposed' | 'agenda' | 'list' = $state('grid');
	let listSearch = $state('');
	let reportOpen = $state(false);

	const listFilteredSchedule = $derived.by(() => {
		let items = data.schedules;
		if (listSearch.trim() !== '') {
			const q = listSearch.toLowerCase();
			items = items.filter(
				(s) =>
					s.classes.subjects.subject_name.toLowerCase().includes(q) ||
					s.classes.subjects.subject_code.toLowerCase().includes(q) ||
					s.classes.blocks.block_name.toLowerCase().includes(q) ||
					s.classes.instructors?.name.toLowerCase().includes(q) ||
					s.rooms.room_name.toLowerCase().includes(q)
			);
		}
		return items.sort((a, b) => {
			const dayDiff = days.indexOf(a.day_of_week) - days.indexOf(b.day_of_week);
			if (dayDiff !== 0) return dayDiff;
			return a.start_time.localeCompare(b.start_time);
		});
	});

	// --- Report Data ---
	const report = $derived(data.timetable.metadata as GenerationMetadata | null);

	// --- DataTable Columns ---
	const columns: ColumnDef<any>[] = [
		{
			accessorKey: 'classes.subjects.subject_code',
			header: 'Subject',
			cell: ({ row }) => renderSnippet(subjectCell, { row: row.original })
		},
		{
			accessorKey: 'course_type',
			header: 'Type',
			cell: ({ row }) => renderSnippet(typeCell, { type: row.original.course_type })
		},
		{
			accessorKey: 'classes.blocks.block_name',
			header: 'Block'
		},
		{
			accessorKey: 'classes.instructors.name',
			header: 'Instructor',
			cell: ({ row }) => row.original.classes.instructors?.name || 'Unassigned'
		},
		{
			accessorKey: 'rooms.room_name',
			header: 'Room'
		},
		{
			accessorKey: 'day_of_week',
			header: 'Day'
		},
		{
			id: 'time',
			header: 'Time',
			accessorFn: (row) => `${row.start_time} - ${row.end_time}`,
			cell: ({ row }) =>
				`${row.original.start_time.substring(0, 5)} - ${row.original.end_time.substring(0, 5)}`,
			meta: {
				class: 'text-right'
			}
		}
	];
</script>

{#snippet subjectCell({ row }: { row: any })}
	<div class="flex flex-col">
		<span class="font-medium">{row.classes.subjects.subject_name}</span>
		<span class="text-xs text-muted-foreground">{row.classes.subjects.subject_code}</span>
	</div>
{/snippet}

{#snippet typeCell({ type }: { type: string })}
	<Badge variant={type === 'Lecture' ? 'default' : 'destructive'} class="w-fit">
		{type}
	</Badge>
{/snippet}

<!-- Report Dialog -->
<Dialog.Root bind:open={reportOpen}>
	<Dialog.Content class="max-w-2xl max-h-[90vh] overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>Generation Report</Dialog.Title>
			<Dialog.Description>Statistics and details from the last generation run.</Dialog.Description>
		</Dialog.Header>
		<div class="space-y-4 py-4">
			{#if !report || report.status == 'Generating'}
				<div class="flex flex-col items-center justify-center py-8 space-y-4">
					<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
					<p class="text-muted-foreground">Generation in progress...</p>
				</div>
			{:else}
				<div class="grid grid-cols-2 gap-4">
					<div class="p-4 border rounded-lg bg-muted/50">
						<p class="text-sm text-muted-foreground">Success Rate</p>
						<p
							class="text-2xl font-bold {report.successRate === 100
								? 'text-green-600'
								: 'text-amber-600'}"
						>
							{report.successRate}%
						</p>
						<p class="text-xs text-muted-foreground">
							{report.scheduledCount} / {report.totalClasses} classes
						</p>
					</div>
					<div class="p-4 border rounded-lg bg-muted/50">
						<p class="text-sm text-muted-foreground">Execution Time</p>
						<p class="text-2xl font-bold">{report.timeTakenSec}</p>
					</div>
				</div>

				{#if report.failedClasses && report.failedClasses.length > 0}
					<div class="border rounded-lg p-4 border-destructive/20 bg-destructive/5">
						<h3 class="font-semibold text-destructive mb-2">
							Failed Classes ({report.failedClasses.length})
						</h3>
						<div class="max-h-[200px] overflow-y-auto space-y-2">
							{#each report.failedClasses as fail}
								<div class="text-sm border-b last:border-0 pb-2 last:pb-0 border-destructive/10">
									<span class="font-medium">{fail.class}</span>:
									<span class="text-muted-foreground">{fail.reason}</span>
								</div>
							{/each}
						</div>
					</div>
				{:else}
					<Card.Root>
						<Card.Content class="p-4">
							<p class="font-medium">All classes scheduled successfully! 🎉</p>
						</Card.Content>
					</Card.Root>
				{/if}
				<Separator />
				<div class="text-xs text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1 mt-4 pt-4">
					<p>
						<span class="font-semibold">Algorithm:</span>

						{report.algorithm.charAt(0).toUpperCase() + report.algorithm.slice(1) || 'N/A'}
					</p>
					<p><span class="font-semibold">Rooms Used:</span> {report.roomsUsed}</p>
					<p>
						<span class="font-semibold">Academic Year:</span>
						{report.generation_params?.academic_year || 'N/A'}
					</p>
					<p>
						<span class="font-semibold">Semester:</span>
						{report.generation_params?.semester || 'N/A'}
					</p>
					<p>
						<span class="font-semibold">Time Range:</span>
						{report.generation_params?.scheduleStartTime || 'N/A'} - {report.generation_params
							?.scheduleEndTime || 'N/A'}
					</p>
					<p>
						<span class="font-semibold">Break Time:</span>
						{report.generation_params?.breakTime || 'None'}
					</p>
				</div>

				{#if report.generation_params?.constraints}
					<Separator />
					<h4 class="text-sm font-semibold mb-2">Constraints Applied</h4>
					<div class="flex flex-wrap gap-2">
						<!-- , , ,  -->
						{#if report.generation_params.constraints.enforceCapacity}
							<Badge variant="outline">Capacity Check<CircleCheck /></Badge>
						{/if}
						{#if report.generation_params.constraints.enforceInstructor}
							<Badge variant="outline">Instructor Conflict <UserCheck /></Badge>
						{/if}
						{#if report.generation_params.constraints.enforceBlock}
							<Badge variant="outline">Block Conflict<Grid2X2Check /></Badge>
						{/if}
						{#if report.generation_params.constraints.roomTypeConstraint === 'strict'}
							<Badge variant="outline">Strict Room Type<MapPinCheck /></Badge>
						{:else if report.generation_params.constraints.roomTypeConstraint === 'soft'}
							<Badge variant="outline">Soft Room Type<MapPinCheck /></Badge>
						{/if}
						{#if report.generation_params.constraints.excludedDays?.length > 0}
							<Badge variant="destructive">
								Excluded Days: {report.generation_params.constraints.excludedDays.join(', ')}
							</Badge>
						{/if}
					</div>
				{/if}
			{/if}
		</div>
		<Dialog.Footer>
			<Dialog.Close>
				<Button variant="outline">Close</Button>
			</Dialog.Close>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<div class="h-full flex flex-col">
	<!-- Sticky Header -->
	<div
		class="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2 border-b"
	>
		<!-- Header & Controls -->
		<header class="flex flex-col gap-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-4">
					<Button variant="outline" size="icon" class="shrink-0" href="/menu/timetables/view">
						<ChevronLeft class="h-4 w-4" />
					</Button>
					<div>
						<h1 class="text-xl font-bold tracking-tight">{data.timetable.name}</h1>
						<p class="text-xs text-muted-foreground mt-0.5">
							{data.timetable.academic_year}, {data.timetable.semester}
						</p>
					</div>
				</div>
				<div class="flex items-center gap-2">
					<!-- Report Button -->
					{#if data.timetable.metadata}
						<Button
							variant="outline"
							size="sm"
							class={report?.failedClasses?.length > 0
								? 'text-amber-600 border-amber-200 hover:bg-amber-50'
								: ''}
							onclick={() => (reportOpen = true)}
						>
							{#if report?.failedClasses?.length > 0}
								<span class="mr-2">⚠️</span>
							{/if}
							Report
						</Button>
					{/if}

					<DropdownMenu.Root>
						<DropdownMenu.Trigger asChild>
							<Button variant="outline" size="sm" disabled={isExporting}>
								{#if isExporting}
									<Spinner class="mr-2 h-4 w-4" />
									Exporting...
								{:else}
									<FileDown class="mr-2 h-4 w-4" />
									Export
								{/if}
							</Button>
						</DropdownMenu.Trigger>
						<DropdownMenu.Content align="end">
							<DropdownMenu.Item onclick={exportAsPDF}>As PDF</DropdownMenu.Item>
							<DropdownMenu.Item onclick={exportAsExcel}>As Excel (XLSX)</DropdownMenu.Item>
							<DropdownMenu.Item onclick={exportAsDOCX} disabled={viewBy !== 'instructor'}>
								As Workload (DOCX)
							</DropdownMenu.Item>
							<DropdownMenu.Item onclick={exportRoomScheduleDOCX}>
								As Room Schedule (DOCX)
							</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</div>
			</div>

			<!-- Toolbar -->
			<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<!-- View Mode Switcher -->
				<div class="flex items-center bg-muted/50 p-1 rounded-lg border w-fit">
					<Button
						variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
						size="sm"
						class="h-8 px-3 rounded-md transition-all"
						onclick={() => (viewMode = 'grid')}
					>
						Grid
					</Button>
					<Button
						variant={viewMode === 'transposed' ? 'secondary' : 'ghost'}
						size="sm"
						class="h-8 px-3 rounded-md transition-all"
						onclick={() => (viewMode = 'transposed')}
					>
						Timeline
					</Button>
					<Button
						variant={viewMode === 'agenda' ? 'secondary' : 'ghost'}
						size="sm"
						class="h-8 px-3 rounded-md transition-all"
						onclick={() => (viewMode = 'agenda')}
					>
						Agenda
					</Button>
					<Button
						variant={viewMode === 'list' ? 'secondary' : 'ghost'}
						size="sm"
						class="h-8 px-3 rounded-md transition-all"
						onclick={() => (viewMode = 'list')}
					>
						List
					</Button>
				</div>

				<!-- Filters (Only for non-list views) -->
				{#if viewMode !== 'list'}
					<div class="flex items-center gap-2 flex-1 md:justify-end">
						{#if viewMode === 'grid' || viewMode === 'transposed'}
							<Select.Root type="single" bind:value={viewBy}>
								<Select.Trigger class="w-[160px] h-9">
									<span> {'View by ' + viewBy.charAt(0).toUpperCase() + viewBy.slice(1)}</span>
								</Select.Trigger>
								<Select.Content>
									<Select.Item value="room"><DoorOpen class="mr-2 h-4 w-4" />Room</Select.Item>
									<Select.Item value="instructor"
										><UserIcon class="mr-2 h-4 w-4" />Instructor</Select.Item
									>
									<Select.Item value="block"><Users class="mr-2 h-4 w-4" />Block</Select.Item>
								</Select.Content>
							</Select.Root>

							<!-- Dynamic "Jump To" Filter -->
							<Select.Root
								type="single"
								value={currentItem?.id.toString()}
								onValueChange={(v) => {
									if (!v) return;
									const newIndex = listSource.findIndex((item) => item.id.toString() === v);
									if (newIndex !== -1) {
										currentItemIndex = newIndex;
									}
								}}
							>
								<Select.Trigger class="w-[200px] h-9">
									<span class="truncate">{gridHeader.title || 'Select an item'}</span>
								</Select.Trigger>
								<Select.Content>
									{#if listSource.length === 0}
										<p class="p-2 text-sm text-muted-foreground text-center">No items to display</p>
									{:else if viewBy === 'room'}
										{#each listSource as room (room.id)}
											<Select.Item
												value={room.id.toString()}
												class="flex items-center justify-between"
											>
												<span>{room.room_name}</span>
												<Badge variant="outline">{itemClassCounts[room.id.toString()] || 0}</Badge>
											</Select.Item>
										{/each}
									{:else if viewBy === 'instructor'}
										{#each listSource as instructor (instructor.id)}
											<Select.Item
												value={instructor.id.toString()}
												class="flex items-center justify-between"
											>
												<span>{instructor.name}</span>
												<Badge variant="outline"
													>{itemClassCounts[instructor.id.toString()] || 0}</Badge
												>
											</Select.Item>
										{/each}
									{:else if viewBy === 'block'}
										{#each listSource as block (block.id)}
											<Select.Item
												value={block.id.toString()}
												class="flex items-center justify-between"
											>
												<span>{block.block_name}</span>
												<Badge variant="outline">{itemClassCounts[block.id.toString()] || 0}</Badge>
											</Select.Item>
										{/each}
									{/if}
								</Select.Content>
							</Select.Root>
						{:else}
							<!-- Agenda View Search -->
							<div class="relative w-[250px]">
								<ClockFading class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
								<input
									type="text"
									placeholder="Search agenda..."
									class="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
									bind:value={listSearch}
								/>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</header>
	</div>

	<!-- Scrollable Main Content -->
	<div class="flex-1 overflow-y-auto py-6">
		{#if viewMode === 'grid'}
			<div id="grid-view-content">
				<Card.Root>
					<Card.Header class="flex flex-row items-center justify-between p-2">
						<div class="flex items-center gap-3">
							{#if gridHeader.icon}
								<svelte:component this={gridHeader.icon} class="h-5 w-5 text-muted-foreground" />
							{/if}
							<div>
								<h2 class="text-lg font-semibold">{gridHeader.title || 'Select a view'}</h2>
								<p class="text-xs text-muted-foreground">{gridHeader.subtitle}</p>
							</div>
							{#if gridHeader.badge}
								<Badge variant="outline" class="ml-2">{gridHeader.badge}</Badge>
							{/if}
						</div>
						<div class="flex items-center gap-2">
							<Button
								variant="outline"
								size="icon"
								class="h-8 w-8"
								onclick={goToPrev}
								disabled={listSource.length < 2}
							>
								<ChevronLeft class="h-4 w-4" />
							</Button>
							<Button
								variant="outline"
								size="icon"
								class="h-8 w-8"
								onclick={goToNext}
								disabled={listSource.length < 2}
							>
								<ChevronRight class="h-4 w-4" />
							</Button>
						</div>
					</Card.Header>
					<Card.Content class="p-0">
						<div class="border-t overflow-x-auto">
							<div
								class="grid min-w-[800px]"
								style="grid-template-columns: 60px repeat(5, 1fr); grid-template-rows: auto repeat({timeSlots.length}, {rowHeight}px);"
							>
								<!-- Time Header -->
								<div
									class="sticky left-0 z-10 p-2 text-center border-r border-b bg-muted/10 font-medium text-sm"
								>
									Time
								</div>
								<!-- Day Headers -->
								{#each days as day (day)}
									<div
										class="sticky top-0 z-10 p-2 border-r border-b bg-muted/10 font-medium text-sm text-center"
									>
										{day}
									</div>
								{/each}

								<!-- Time Slots Column -->
								{#each timeSlots as slot, i (slot)}
									<div
										class="sticky left-0 p-1 text-xs text-muted-foreground border-r bg-muted/10 text-center border-t"
										style="grid-row: {i + 2}; grid-column: 1;"
									>
										{slot}
									</div>
								{/each}

								<!-- Schedule Cells -->
								{#each days as day, col (day)}
									<div
										class="relative border-r"
										style="grid-column: {col + 2}; grid-row: 2 / span {timeSlots.length};"
									>
										<!-- Horizontal lines for 1-hour intervals -->
										{#each timeSlots as _, i (i)}
											<div style="height: {rowHeight}px" class="border-t border-border/50"></div>
										{/each}

										<!-- Scheduled Items -->
										{#each filteredSchedule.filter((s) => s.day_of_week === day) as item (item.id)}
											{@const [startH, startM] = item.start_time.split(':').map(Number)}
											{@const [endH, endM] = item.end_time.split(':').map(Number)}
											{@const startMinutes = (startH - 7) * 60 + startM}
											{@const durationMinutes = endH * 60 + endM - (startH * 60 + startM)}
											{@const top = (startMinutes / 60) * rowHeight}
											{@const height = (durationMinutes / 60) * rowHeight}
											{@const colorVar = generateColorFromString(
												item.classes.subjects.subject_code
											)}

											<div
												class="absolute w-full px-1"
												style="top: {top}px; height: {height - 2}px;"
											>
												<div
													class="schedule-item-cell h-full w-full border-l-4 p-1.5 rounded-md text-left leading-tight overflow-hidden transition-colors hover:brightness-95"
													style="
														background-color: oklch(from var({colorVar}) l c h / 0.25);
														border-left-color: var({colorVar});
														color: oklch(from var({colorVar}) var(--cell-fg-l) c h);
													"
												>
													<div class="flex justify-between items-start">
														<p class="font-bold text-xs truncate">
															{item.classes.subjects.subject_code} - {item.classes.subjects
																.subject_name}
														</p>
														{#if item.course_type === 'Lecture'}
															<Badge variant="default" class="text-[9px] h-4 px-1 ml-1 shrink-0">
																Lec
															</Badge>
														{:else}
															<Badge
																variant="destructive"
																class="text-[9px] h-4 px-1 ml-1 shrink-0"
															>
																Lab
															</Badge>
														{/if}
													</div>
													<p class="text-[10px] opacity-80"></p>

													<div class="text-xs mt-1 space-y-0.5">
														{#if viewBy !== 'block'}
															<p class="truncate">{item.classes.blocks.block_name}</p>
														{/if}
														{#if viewBy !== 'instructor'}
															<p class="truncate">
																{item.classes.instructors?.name || 'N/A'}
															</p>
														{/if}
														{#if viewBy !== 'room'}
															<p class="truncate">{item.rooms.room_name}</p>
														{/if}
													</div>
												</div>
											</div>
										{/each}
									</div>
								{/each}
							</div>
						</div>
					</Card.Content>
				</Card.Root>
			</div>
		{:else if viewMode === 'transposed'}
			<!-- Transposed Timeline View -->
			<div id="transposed-view-content">
				<Card.Root>
					<Card.Header class="flex flex-row items-center justify-between p-2">
						<div class="flex items-center gap-3">
							{#if gridHeader.icon}
								<svelte:component this={gridHeader.icon} class="h-5 w-5 text-muted-foreground" />
							{/if}
							<div>
								<h2 class="text-lg font-semibold">{gridHeader.title || 'Select a view'}</h2>
								<p class="text-xs text-muted-foreground">{gridHeader.subtitle}</p>
							</div>
							{#if gridHeader.badge}
								<Badge variant="outline" class="ml-2">{gridHeader.badge}</Badge>
							{/if}
						</div>
						<div class="flex items-center gap-2">
							<Button
								variant="outline"
								size="icon"
								class="h-8 w-8"
								onclick={goToPrev}
								disabled={listSource.length < 2}
							>
								<ChevronLeft class="h-4 w-4" />
							</Button>
							<Button
								variant="outline"
								size="icon"
								class="h-8 w-8"
								onclick={goToNext}
								disabled={listSource.length < 2}
							>
								<ChevronRight class="h-4 w-4" />
							</Button>
						</div>
					</Card.Header>
					<Card.Content class="p-0">
						<div class="border-t overflow-x-auto">
							<div class="min-w-[1000px]">
								<!-- Header Row (Times) -->
								<div class="flex border-b bg-muted/30">
									<div class="w-32 shrink-0 p-3 font-medium text-sm border-r bg-muted/50">Day</div>
									{#each timeSlots as time (time)}
										<div
											class="flex-1 p-2 text-xs text-center border-r last:border-0 text-muted-foreground"
										>
											{time}
										</div>
									{/each}
								</div>

								<!-- Day Rows -->
								{#each days as day (day)}
									<div class="flex border-b last:border-0 h-24 relative group hover:bg-muted/5">
										<div
											class="w-32 shrink-0 p-3 font-medium text-sm border-r bg-muted/10 flex items-center"
										>
											{day}
										</div>
										<div class="flex-1 relative">
											<!-- Grid Lines -->
											<div class="absolute inset-0 flex pointer-events-none">
												{#each timeSlots as _, i (i)}
													<div
														class="flex-1 border-r last:border-0 border-dashed border-border/30"
													></div>
												{/each}
											</div>

											<!-- Items -->
											{#each filteredSchedule.filter((s) => s.day_of_week === day) as item (item.id)}
												{@const [startH, startM] = item.start_time.split(':').map(Number)}
												{@const [endH, endM] = item.end_time.split(':').map(Number)}
												{@const startMinutes = (startH - 7) * 60 + startM}
												{@const durationMinutes = endH * 60 + endM - (startH * 60 + startM)}
												{@const totalMinutes = (21 - 7) * 60}
												{@const colorVar = generateColorFromString(
													item.classes.subjects.subject_code
												)}

												<div
													class="schedule-item-cell absolute top-2 bottom-2 rounded-md p-2 text-xs border-l-4 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden"
													style="
                                                    left: {(startMinutes / totalMinutes) * 100}%;
                                                    width: {(durationMinutes / totalMinutes) *
														100}%;
                                                    background-color: oklch(from var({colorVar}) l c h / 0.25);
                                                    border-left-color: var({colorVar});
                                                    color: oklch(from var({colorVar}) var(--cell-fg-l) c h);
                                                "
												>
													<div class="font-bold truncate">
														{item.classes.subjects.subject_code}
													</div>
													<div class="opacity-80 truncate">{item.rooms.room_name}</div>
												</div>
											{/each}
										</div>
									</div>
								{/each}
							</div>
						</div>
					</Card.Content>
				</Card.Root>
			</div>
		{:else if viewMode === 'agenda'}
			<!-- Grouped Agenda View -->
			<div id="agenda-view-content" class="grid grid-cols-1 md:grid-cols-2 gap-6">
				{#each days as day (day)}
					{@const dayItems = listFilteredSchedule.filter((s) => s.day_of_week === day)}
					{#if dayItems.length > 0}
						<Card.Root class="overflow-hidden bg-muted/30">
							<Card.Header class=" py-3 px-4 border-b">
								<h3 class="font-semibold flex items-center gap-2">
									{day}
								</h3>
							</Card.Header>
							<Card.Content class="p-0">
								<div class="divide-y">
									{#each dayItems as item (item.id)}
										<div class="p-4 flex gap-4 hover:bg-muted/20 transition-colors">
											<div class="flex flex-col items-center justify-center w-16 shrink-0">
												<span class="text-sm font-bold">{item.start_time.substring(0, 5)}</span>
												<div class="h-8 w-0.5 bg-border my-1"></div>
												<span class="text-xs text-muted-foreground"
													>{item.end_time.substring(0, 5)}</span
												>
											</div>
											<div class="flex-1 space-y-1">
												<div class="flex items-start justify-between">
													<h4 class="font-semibold text-sm">
														{item.classes.subjects.subject_name}
													</h4>
													{#if item.course_type === 'Lecture'}
														<Badge variant="default" class="text-[10px] h-5 px-1 ml-1 shrink-0">
															Lec
														</Badge>
													{:else}
														<Badge variant="destructive" class="text-[10px] h-5 px-1 ml-1 shrink-0">
															Lab
														</Badge>
													{/if}
												</div>

												<div class="flex items-center gap-4 text-xs text-muted-foreground">
													<span class="flex items-center gap-1">
														<Building class="h-3 w-3" />
														{item.rooms.room_name}
													</span>
													<span class="flex items-center gap-1">
														<UserIcon class="h-3 w-3" />
														{item.classes.instructors?.name || 'Unassigned'}
													</span>
													<span class="flex items-center gap-1">
														<Users class="h-3 w-3" />
														{item.classes.blocks.block_name}
													</span>
												</div>
											</div>
										</div>
									{/each}
								</div>
							</Card.Content>
						</Card.Root>
					{/if}
				{/each}
			</div>
		{:else}
			<!-- List View -->
			<div id="list-view-content" class="h-full">
				<DataTable data={data.schedules} {columns} />
			</div>
		{/if}
	</div>
</div>
