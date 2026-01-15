export interface LineChartData {
    name: string;
    value: number;
    [key: string]: string | number;
}

export interface BarChartData {
    name: string;
    value: number;
    secondaryValue?: number;
    [key: string]: string | number | undefined;
}

export interface DonutChartData {
    name: string;
    value: number;
    [key: string]: string | number;
}

export interface HeatmapCell {
    day: number;
    hour: number;
    count: number;
    intensity: number;
}
