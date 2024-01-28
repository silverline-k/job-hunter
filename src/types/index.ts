export interface JobInfo {
    id: number;
    companyName: string;
    positionName: string;
    positionTitle: string;
    companyLocation: string;
    companyAddress: string;
    url: string;
    mainResponsibilities: null | string; // 주요업무
    qualifications: null | string; // 자격요건
    preferences: null | string; // 우대사항
    welfareBenefits: null | string; // 혜택 및 복지
    closingDate: null | string; // null인 경우 상시
}

export type JobList = JobInfo[];

export type PositionIndex = number;

export interface JobDescription {
    mainResponsibilities?: string; // 주요업무
    qualifications?: string; // 자격요건
    preferences?: string; // 우대사항
    welfareBenefits?: string; // 혜택 및 복지
}
