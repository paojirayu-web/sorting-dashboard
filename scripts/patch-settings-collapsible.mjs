import fs from 'fs';

const path = 'src/components/dashboard/views/SettingsView.tsx';
const lines = fs.readFileSync(path, 'utf8').split(/\r?\n/);

const genIdx = lines.findIndex((l) => l.trim().startsWith('<h2') && l.includes('General Settings'));
const startLine = genIdx - 2;
const changelogIdx = lines.findIndex(
    (l) => l.includes('SectionHeader') && l.includes('Changelog'),
);

const before = lines.slice(0, startLine);
const afterChangelogHeader = lines.slice(changelogIdx + 1);
let endIdx = afterChangelogHeader.length;
while (endIdx > 0 && afterChangelogHeader[endIdx - 1].trim() === '</SettingsCollapsible>') {
    endIdx--;
}
const changelogBody = afterChangelogHeader.slice(0, endIdx);

const collapseBlock = `                <SettingsCollapsible
                    title="General Settings"
                    icon={<SettingsIcon size={24} className={theme.accentText} />}
                    theme={theme}
                >
                    <SettingsCollapsible
                        nested
                        title="Theme Preference"
                        subtitle="Toggle between dark and light mode."
                        theme={theme}
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setCurrentTheme(currentTheme === 'dark' ? 'light' : 'dark')}
                                className={\`p-2.5 rounded-xl \${theme.inputBg} \${theme.textWhite} border \${theme.borderColor} transition-all flex items-center gap-2 hover:opacity-80\`}
                                title="Toggle Theme"
                            >
                                {currentTheme === 'dark' ? (
                                    <Sun size={16} className="text-yellow-400" />
                                ) : (
                                    <Moon size={16} className="text-slate-700" />
                                )}
                                <span className="text-xs font-bold">
                                    {currentTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                                </span>
                            </button>
                        </div>
                    </SettingsCollapsible>

                    <SettingsCollapsible
                        nested
                        title="Daily Defects Report"
                        subtitle="Manual export / LINE send and automatic schedule."
                        theme={theme}
                    >
                        <p className={\`text-xs \${theme.textSecondary} -mt-1\`}>
                            Manual export: pick a report date below. Automatic LINE uses today
                            (Bangkok) — see schedule settings.
                        </p>
                        <ExportDailyDefectsActions theme={theme} showDatePicker layout="stacked" />
                        <DailyReportAutomationSettings theme={theme} />
                    </SettingsCollapsible>
                </SettingsCollapsible>

                <SettingsCollapsible
                    title="Changelog & Updates"
                    subtitle="Track what's new and what has been fixed in the Sorting Dashboard."
                    theme={theme}
                >`;

const tail = `                </SettingsCollapsible>

        </div>
    );
}
`;

const out = [...before, collapseBlock, ...changelogBody, tail].join('\n');
fs.writeFileSync(path, out);
console.log('Patched', { startLine, changelogIdx, changelogBlocks: changelogBody.length });
