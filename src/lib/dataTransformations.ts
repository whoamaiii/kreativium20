export type DataPoint = { timestamp: number | Date; value: number; [key: string]: unknown };

function toDate(ts: number | Date): Date {
	return ts instanceof Date ? ts : new Date(ts);
}

export const dataTransformations = {
	normalize(data: DataPoint[]): DataPoint[] {
		if (!Array.isArray(data) || data.length === 0) return [];
		const values = data.map(d => Number(d.value) || 0);
		const min = Math.min(...values);
		const max = Math.max(...values);
		const range = max - min || 1;
		return data.map(d => ({ ...d, value: (Number(d.value) - min) / range }));
	},
	aggregate(data: DataPoint[], period: 'daily' | 'hourly' = 'daily'): DataPoint[] {
		const buckets = new Map<string, { sum: number; count: number; ts: number }>();
		for (const d of data) {
			const date = toDate(d.timestamp);
			const key = period === 'hourly'
				? `${date.getUTCFullYear()}-${date.getUTCMonth()+1}-${date.getUTCDate()} ${date.getUTCHours()}`
				: `${date.getUTCFullYear()}-${date.getUTCMonth()+1}-${date.getUTCDate()}`;
			const prev = buckets.get(key) || { sum: 0, count: 0, ts: date.getTime() };
			prev.sum += Number(d.value) || 0;
			prev.count += 1;
			prev.ts = Math.min(prev.ts, date.getTime());
			buckets.set(key, prev);
		}
		return Array.from(buckets.values()).map(b => ({ timestamp: b.ts, value: b.sum / b.count }));
	},
	filter(data: DataPoint[], opts: { min?: number; max?: number }): DataPoint[] {
		const { min, max } = opts || {};
		return data.filter(d => {
			const v = Number(d.value);
			if (Number.isNaN(v)) return false;
			if (min != null && v < min) return false;
			if (max != null && v > max) return false;
			return true;
		});
	}
};