export interface JobInfo {
    id: string;
    companyName: string;
    positionTitle: string;
    location: string;
    url: string;
}

export type JobList = JobInfo[];

export type PositionIndex = number;
