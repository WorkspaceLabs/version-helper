interface RuleData {
    id: number;
    uuid: string;
    locationId: string;
    everyone: boolean;
    appcritical: boolean;
    environment: string;
    department: string;
    company: string;
    internalonly: boolean;
    sortableid: string;
    version: string;
    createdDtLcl: string;
    createdDtGMT: string;
    isRiskyRelease: boolean;
    appname: string;
    appType?: never;
    tktNum?: never;
    tktUrl?: never;
    versionDesc?: never;
    requestedBy?: never;
    approvedBy?: never;
    rollbackVersion: string;
    isRollback: boolean;
    datacenters: string[];
}

interface ParsedRuleData extends RuleData {
    index: number;
    parsedVersion: ParsedVersion;
}

interface ParsedVersionData extends VersionData {
    index: number;
    parsedVersion: ParsedVersion;
}

interface ParsedVersion {
    major: number;
    minor: number;
    patch: number;
    rawVersion: string;
}

interface DeleteVersionData {
    major: string;
    minor: string;
    patch: string;
    revision: undefined;
}

interface AppReleaseApi {
    deleteRule(rule: RuleData, datacenters: string[]): void;
    deleteUndeleteVersion(method: 'DeleteVersion', appName: string, version: DeleteVersionData, datacenters: string[], callback: DeleteVersionCallback): void;
    selectedApp: AppApi
    ruleDeletedWait: MomentDuration;
    pageLoadTime: Moment;

    loadVersions(appName: string, appType: string): void;
    loadAllRules(appName: string): void;
    loadAuditLogs(): void;
    loadVersionDeleteConfig(): void;
}

interface AppApi {
    getName(): string;
    getType(): string;
}

interface MomentDuration {
    days(): number
}

interface InvokeMessageData {
    method: string;
    data: object;
    success(response: { Message: string }): void;
}

interface VersionData {
    id: string;
    version: string;
    description: string;
    createdDate: string;
    hasRules: boolean;
    Type?: any;
    rulesClearedDateTime?: string;
    deletedDateTime?: string;
    deployDeletedDateTime?: string;
    datacenter: string;
    deploySize: number;
    isConcurrent: boolean;
    internalReleasePeriod: number;
    pool: string;
    datacenters: string[];
    dataCentersMap: object;
}

interface Moment {
    toDate(): Date;
}

interface DeleteVersionResponse {
    success: boolean;
    message?: string;
}

type DeleteVersionCallback = (response: DeleteVersionResponse) => void;
type ToastMethod = (type: 'info' | 'error', title: string, text: string) => void;