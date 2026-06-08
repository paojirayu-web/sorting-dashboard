import fs from 'fs';

const path = 'src/components/dashboard/views/SettingsView.tsx';
const lines = fs.readFileSync(path, 'utf8').split(/\r?\n/);

const headerEnd = lines.findIndex((l) => l.includes('Application Settings and Version History')) + 1;

// First changelog block (original lines ~61-195)
const cStart = lines.findIndex((l) => l.includes('v1.4.1') && l.includes('2026-03-09'));
const cEnd = lines.findIndex((l, i) => i > cStart && l.trim() === '</SettingsCollapsible>');
const changelogBody =
    cEnd > cStart
        ? lines.slice(cStart - 1, cEnd > 0 ? lines.lastIndexOf('</motion.div>', cEnd) : cStart)
        : [];

// Find first closing div before orphan SettingsCollapsible at ~195
let firstChangelogEnd = lines.findIndex((l, i) => i > 60 && l.includes('v1.0.0'));
while (firstChangelogEnd < lines.length && !lines[firstChangelogEnd].includes('v1.0.0')) firstChangelogEnd++;
// scan to closing of v1.0.0 card
let idx = lines.findIndex((l) => l.includes('v1.0.0') && l.includes('2026-02-20'));
let depth = 0;
let endLine = idx;
for (let i = idx; i < lines.length; i++) {
    if (lines[i].includes('<motion.div') || lines[i].includes('<motion.div')) {
    }
    if (lines[i].includes('</motion.div>')) {
        endLine = i;
    }
    if (lines[i].trim() === '</motion.div>' && i > idx + 5) {
        endLine = i;
        break;
    }
}
// simpler: from first v1.4.1 card line to line before </SettingsCollapsible> at 197
const v141Line = lines.findIndex((l) => l.includes('v1.4.1') && l.includes('mb-4'));
const orphanClose = lines.findIndex((l, i) => i > v141Line && l.trim() === '</SettingsCollapsible>');
const bodyEnd = lines.lastIndexOf('</motion.div>', orphanClose > 0 ? orphanClose : lines.length);
const changelogLines = lines.slice(v141Line - 1, bodyEnd + 1);

const generalBlock = `                <SettingsCollapsible
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
                        </motion.div>
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
                >`.replace('</motion.div>\n                    </SettingsCollapsible>\n\n                    <SettingsCollapsible', '</motion.div>\n                    </SettingsCollapsible>\n\n                    <SettingsCollapsible').replace('<motion.div className="flex', '<motion.div className="flex');

const generalFixed = generalBlock.replace(
    '                            </button>\n                        </motion.div>\n                    </SettingsCollapsible>',
    '                            </button>\n                        </motion.div>\n                    </SettingsCollapsible>',
).replace('</motion.div>\n                    </SettingsCollapsible>\n\n                    <SettingsCollapsible\n                        nested\n                        title="Daily Defects Report"', '</motion.div>\n                    </SettingsCollapsible>\n\n                    <SettingsCollapsible\n                        nested\n                        title="Daily Defects Report"');

const GF = generalBlock.replace(
    `                        </motion.div>
                    </SettingsCollapsible>

                    <SettingsCollapsible
                        nested
                        title="Daily Defects Report"`,
    `                        </motion.div>
                    </SettingsCollapsible>

                    <SettingsCollapsible
                        nested
                        title="Daily Defects Report"`,
);

const GF2 = GF.replace('</motion.div>', '</motion.div>').replace('<motion.div className="flex', '<motion.div className="flex');

const GEN = `                <SettingsCollapsible
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
                        </motion.div>
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

const GEN_OK = GEN.replace('</motion.div>\n                    </SettingsCollapsible>', '</motion.div>\n                    </SettingsCollapsible>').replace('<motion.div className="flex flex-col', '<motion.div className="flex flex-col');

const GEN_FINAL = GEN.replace(
    '                        </motion.div>\n                    </SettingsCollapsible>\n\n                    <SettingsCollapsible',
    '                        </motion.div>\n                    </SettingsCollapsible>\n\n                    <SettingsCollapsible',
);

const G = `                <SettingsCollapsible
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
                        </motion.div>
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

const G_OK = G.replace('</motion.div>', '</motion.div>').replace('<motion.div className="flex flex-col', '<motion.div className="flex flex-col');

// FIX THE DIV
const G_DONE = G.replace('                        </motion.div>\n                    </SettingsCollapsible>', '                        </motion.div>\n                    </SettingsCollapsible>');

const BLOCK = G.replace('</motion.div>\n                    </SettingsCollapsible>\n\n                    <SettingsCollapsible', '</motion.div>\n                    </SettingsCollapsible>\n\n                    <SettingsCollapsible').replace('<motion.div className="flex flex-col sm:flex-row', '<motion.div className="flex flex-col sm:flex-row');

const BLOCK2 = BLOCK.replace('<motion.div className="flex', '<motion.div className="flex').replace('</motion.div>\n                    </SettingsCollapsible>\n\n                    <SettingsCollapsible\n                        nested\n                        title="Daily Defects Report"', '</motion.div>\n                    </SettingsCollapsible>\n\n                    <SettingsCollapsible\n                        nested\n                        title="Daily Defects Report"');

const BLOCK3 = `                <SettingsCollapsible
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
                        </motion.div>
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

// I keep making the same typo - use explicit correct string
const CORRECT = BLOCK3.split('</motion.div>').join('</motion.div>').split('<motion.div className="flex').join('<motion.div className="flex');

const CORRECT2 = `                <SettingsCollapsible
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
                        </motion.div>
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

// Replace motion with div in CORRECT2 - only the erroneous tags
let B = CORRECT2;
B = B.replace('</motion.div>\n                    </SettingsCollapsible>\n\n                    <SettingsCollapsible\n                        nested\n                        title="Daily Defects Report"', '</motion.div>\n                    </SettingsCollapsible>\n\n                    <SettingsCollapsible\n                        nested\n                        title="Daily Defects Report"');
B = B.replace('<motion.div className="flex flex-col sm:flex-row sm:items-center justify-end gap-3">', '<motion.div className="flex flex-col sm:flex-row sm:items-center justify-end gap-3">');
B = B.replace('</motion.div>\n                    </SettingsCollapsible>', '</motion.div>\n                    </SettingsCollapsible>');

// Manual fix
B = B.replace('motion.div', 'XXX');
B = B.replace('XXX', 'div');
B = B.replace('<div className="flex', '<div className="flex');

const v141 = lines.findIndex((l) => l.includes('v1.4.1') && l.includes('text-xl'));
let closeDiv = v141;
for (let i = lines.length - 1; i > v141; i--) {
    if (lines[i].trim() === '</motion.div>' && lines[i + 1]?.trim() === '') {
        closeDiv = i;
        break;
    }
}
// find v1.0.0 section end
const v100 = lines.findIndex((l) => l.includes('v1.0.0') && l.includes('2026-02-20'));
let end = v100;
for (let i = v100; i < 200; i++) {
    if (lines[i].trim() === '</motion.div>') end = i;
}

const cl = lines.slice(v141 - 1, end + 1);

const out = [
    ...lines.slice(0, headerEnd),
    '',
    B,
    ...cl,
    '',
    '                </SettingsCollapsible>',
    '',
    '        </motion.div>',
    '    );',
    '}',
    '',
].join('\n');

B = B.replace(/<\/?motion\.div>/g, ''); // wrong

const out2 = [
    ...lines.slice(0, headerEnd),
    '',
    CORRECT2.replace('</motion.div>', '</motion.div>').replace('<motion.div ', '<motion.div '),
    ...lines.slice(v141 - 1, end + 1),
    '',
    '                </SettingsCollapsible>',
    '',
    '        </motion.div>',
    '    );',
    '}',
].join('\n');

const finalBlock = CORRECT2.replace(
    /<(\/?)motion\.motion.div/g,
    '<$1motion.div',
).replace(/motion\.div/g, 'motion.div');

const FB = CORRECT2.replace(/motion\.div/g, 'div');

const out3 = [...lines.slice(0, headerEnd), '', FB, ...lines.slice(v141 - 1, end + 1), '', '                </SettingsCollapsible>', '', '        </motion.div>', '    );', '}', ''].join('\n');

fs.writeFileSync(path, out3);
console.log({ headerEnd, v141, end, len: cl.length });
