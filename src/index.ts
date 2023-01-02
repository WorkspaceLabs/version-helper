/// <reference types="slickgrid" />

import { addDays, defer, delay } from './utils.js';

export interface Grid<T extends Slick.SlickData> {
    getDataView(): Slick.Data.DataView<T>;
    getGridObj(): Slick.Grid<T>;
}

declare const allRulesGrid: Grid<RuleData>;
declare const versionsGrid: Grid<VersionData>;
declare const appRelease: AppReleaseApi;

declare let toast: ToastMethod;
declare let invokeMethod: (data: InvokeMessageData) => void;

export function selectRules() {
    const { items, minReleasedVersion } = getReleasedVersions();

    // No released version
    if (minReleasedVersion === undefined) return;

    const selectedItems = items.filter(x => {
        if (isCustomRule(x)) return true;
        if (isInternal(x) || isEveryone(x)) return false;

        return !isGreaterVersion(x.parsedVersion, minReleasedVersion);
    });
    const selectedIndies = selectedItems.map(x => x.index);

    const grid = allRulesGrid.getGridObj();
    grid.setSelectedRows(selectedIndies);

    toast('info', 'All deletable rules have been selected.', `${selectedIndies.length} items`);
}

export async function deleteRules(timeout = 30000) {
    const dataView = allRulesGrid.getDataView();
    const grid = allRulesGrid.getGridObj();
    const items: ParsedRuleData[] = dataView.getItems().map((ruleData, index) => {
        return {
            ...ruleData,
            index,
            parsedVersion: parseVersion(ruleData.version)
        };
    });
    const selectedIndies = grid.getSelectedRows();
    const selectedItems = items.filter(x => selectedIndies.includes(x.index));

    let hasFailed = false;
    for (const item of selectedItems) {
        const result = await deleteRule(item, timeout);
        if (!result) {
            hasFailed = true;
            break;
        }
    }

    const app = appRelease.selectedApp;
    appRelease.loadAllRules(app.getName());
    appRelease.loadVersions(app.getName(), app.getType());

    grid.setSelectedRows([]);

    if (!hasFailed) {
        toast('info', 'All selected rule have been deleted.', `${selectedItems.length} items`);
    }
}

export function selectVersions() {
    const dataView = versionsGrid.getDataView();
    const items: ParsedVersionData[] = dataView.getItems().map((ruleData, index) => {
        return {
            ...ruleData,
            index,
            parsedVersion: parseVersion(ruleData.version)
        };
    });

    // Make sure that versions are displayed without column sorting
    for (let i = 1; i < items.length; i++) {
        if (isGreaterVersion(items[i].parsedVersion, items[i - 1].parsedVersion)) {
            throw 'Please remove sorting from `ALL RULES` table by reselecting the same app in `COMPONENTS` table.'
        }
    }

    const { minReleasedVersion } = getReleasedVersions();
    if (!minReleasedVersion) return;

    const deleteWaitingDays = appRelease.ruleDeletedWait.days();
    const maxDeletableDate = addDays(appRelease.pageLoadTime.toDate(), -deleteWaitingDays);
    const selectedItems = items.filter(x => {
        if (!isDeletableVersion(x, maxDeletableDate)) return false;
        if (isCustomVersion(x.parsedVersion)) return true;

        return !isGreaterVersion(x.parsedVersion, minReleasedVersion);
    });
    const selectedIndies = selectedItems.map(x => x.index);

    const grid = versionsGrid.getGridObj();
    grid.setSelectedRows(selectedIndies);

    toast('info', 'All deletable version have been selected.', `${selectedIndies.length} items`);
}

export async function deleteVersions(timeout = 30000) {
    const dataView = versionsGrid.getDataView();
    const grid = versionsGrid.getGridObj();
    const items: ParsedVersionData[] = dataView.getItems().map((ruleData, index) => {
        return {
            ...ruleData,
            index,
            parsedVersion: parseVersion(ruleData.version)
        };
    });
    const selectedIndies = grid.getSelectedRows();
    const selectedItems = items.filter(x => selectedIndies.includes(x.index));

    let hasFailed = false;
    for (const item of selectedItems) {
        const result = await deleteVersion(item, timeout);
        if (!result) {
            hasFailed = true;
            break;
        }
    }

    const app = appRelease.selectedApp;
    appRelease.loadVersions(app.getName(), app.getType());

    grid.setSelectedRows([]);

    if (!hasFailed) {
        toast('info', 'All selected version have been deleted.', `${selectedItems.length} items`);
    }
}

function getReleasedVersions() {
    const dataView = allRulesGrid.getDataView();
    const items: ParsedRuleData[] = dataView.getItems().map((ruleData, index) => {
        return {
            ...ruleData,
            index,
            parsedVersion: parseVersion(ruleData.version)
        };
    });

    // Make sure that versions are displayed without column sorting
    for (let i = 1; i < items.length; i++) {
        if (isGreaterVersion(items[i].parsedVersion, items[i - 1].parsedVersion)) {
            throw 'Please remove sorting from `ALL RULES` table by reselecting the same app in `COMPONENTS` table.'
        }
    }

    const everyOneVersion: ParsedVersion | undefined = items.filter(isEveryone)
        .map(x => parseVersion(x.version))[0];
    const internalVersion: ParsedVersion | undefined = items.filter(isInternal)
        .map(x => parseVersion(x.version))[0];
    const minReleasedVersion = everyOneVersion !== undefined ? everyOneVersion : internalVersion;

    return { items, everyOneVersion, internalVersion, minReleasedVersion };
}

async function deleteRule(rule: RuleData, timeout: number): Promise<boolean> {
    const originalInvoke = invokeMethod;
    const deleteDefer = defer<boolean>();
    let errorMessage: string | undefined;

    // Patch method to delete rule to expose progress status/promise
    invokeMethod = (data) => {
        // Restore it back
        invokeMethod = originalInvoke;

        data.success = ({ Message }) => {
            if (Message === '') {
                deleteDefer.resolve(true);
            }
            else {
                errorMessage = Message;
                deleteDefer.resolve(false);
            }
        };

        originalInvoke(data);
    };

    // This method should call `invokeMethod` internally.
    appRelease.deleteRule({ ...rule }, [...rule.datacenters]);

    const result = await Promise.race([
        deleteDefer.promise,
        delay(timeout, false)
    ]);

    if (!result) {
        if (errorMessage === undefined) {
            errorMessage = `Due to timeout reached (${timeout.toFixed(0)}s.)`;
        }

        toast('error', `Unable to delete rule of ${rule.version}(${rule.uuid})`, errorMessage);
        console.error('Deleted rule error', rule.version, rule.uuid, errorMessage);
    }
    else {
        console.info('Deleted rule', rule.version, rule.uuid)
    }

    return result;
}

async function deleteVersion(version: ParsedVersionData, timeout: number): Promise<boolean> {
    const deleteDefer = defer<boolean>();
    let errorMessage: string | undefined;

    appRelease.deleteUndeleteVersion(
        'DeleteVersion',
        appRelease.selectedApp.getName(),
        {
            major: version.parsedVersion.major.toString(10),
            minor: version.parsedVersion.minor.toString(10),
            patch: version.parsedVersion.patch.toString(10),
            revision: undefined
        },
        [...version.datacenters],
        response => {
            errorMessage = response.message || 'Unknown error';

            deleteDefer.resolve(response.success);
        }
    );

    const result = await Promise.race([
        deleteDefer.promise,
        delay(timeout, false)
    ]);

    if (!result) {
        if (errorMessage === undefined) {
            errorMessage = `Due to timeout reached (${timeout.toFixed(0)}s.)`;
        }

        toast('error', `Unable to delete version - ${version.version}`, errorMessage);
        console.error('Deleted version error', version.version, errorMessage);
    }
    else {
        console.info('Deleted rule', version.version)
    }

    return result;
}

function isEveryone(item: RuleData) {
    return item.everyone === true && item.uuid === '' && item.locationId === '';
}

function isInternal(item: RuleData) {
    return item.internalonly === true && item.uuid === '' && item.locationId === '';
}

function isCustomRule(item: ParsedRuleData) {
    return item.parsedVersion.major === 0 && item.uuid !== '';
}

function isCustomVersion(version: ParsedVersion) {
    return version.major === 0;
}

function parseVersion(version: string): ParsedVersion {
    const tokens = <[string, string, string]>version.split('.');
    if (tokens.length !== 3) throw 'Invalid version: It must follow "major.minor.patch" pattern';

    return {
        major: parseVersionNumber(tokens[0]),
        minor: parseVersionNumber(tokens[1]),
        patch: parseVersionNumber(tokens[2]),
        version
    }
}

function parseVersionNumber(version: string) {
    return parseInt(version, 10);
}

function isDeletableVersion(version: VersionData, maxDeletableDate: Date) {
    // Already be deleted
    if (version.deletedDateTime) return false;

    // Cannot be deleted
    if (!version.rulesClearedDateTime) return false;

    const clearedDateTime = Date.parse(version.rulesClearedDateTime);
    if (isNaN(clearedDateTime)) return false;

    return new Date(clearedDateTime) < maxDeletableDate
}

// target > base
function isGreaterVersion(target: ParsedVersion, base: ParsedVersion) {
    if (target.major > base.major) return true;
    if (target.major < base.major) return false;

    // Same major version
    if (target.minor > base.minor) return true;
    if (target.minor < base.minor) return false;

    // Same minor version
    return target.patch > base.patch;
}