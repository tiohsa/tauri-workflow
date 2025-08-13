export type ID = string;

export interface ProjectSettings {
    name: string;
    dueDate: string; // ISO
    projectBufferDays: number; // 小数可
    useFiftyPctEstimate: boolean;
    shrinkRatio: number; // 例: 0.6
    hoursPerDay: number; // 例: 8
}

export interface NodeEntity {
    id: ID;
    name: string;
    effortHours: number; // 入力は時間
    start?: string; // ISO datetime/date
    end?: string;   // ISO
    locked?: boolean;
    groupId?: ID | null;
    position?: { x: number; y: number }; // 表示用
}

export interface EdgeEntity {
    id: ID;
    source: ID;
    target: ID; // 有向: source -> target (target が右)
}

export interface GroupEntity {
    id: ID;
    name: string;
    nodeIds: ID[];
}

export interface ProjectSnapshot {
    project: ProjectSettings;
    nodes: NodeEntity[];
    edges: EdgeEntity[];
    groups: GroupEntity[];
}
