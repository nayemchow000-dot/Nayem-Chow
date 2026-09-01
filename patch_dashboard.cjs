const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

// 1. Add selectedStageIdx state
content = content.replace('const [error, setError] = useState<string | null>(null);', 'const [error, setError] = useState<string | null>(null);\n  const [selectedStageIdx, setSelectedStageIdx] = useState<number | null>(null);');

// 2. Replace the mapping for the 16 cards to be more premium and clickable
const oldMapping = `{BENGALI_STAGES.map((stage, idx) => {
            const count = contacts.filter(c => c.currentStage === idx + 1).length;
            const Icon = stage.icon;
            return (
              <div key={idx} className="group relative bg-[#121214]/80 backdrop-blur-md border border-white/5 rounded-xl p-4 flex flex-col items-center text-center hover:border-emerald-500/30 hover:bg-[#16161A] hover:-translate-y-1 transition-all duration-300 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)]">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 group-hover:bg-emerald-500/20 text-emerald-500">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-[11px] sm:text-xs font-bold text-[#E5E5E7] mb-1 leading-tight">{stage.title}</h3>
                <p className="text-[10px] text-white/40 font-mono">{count} Members</p>
              </div>
            );
          })}`;

const newMapping = `{BENGALI_STAGES.map((stage, idx) => {
            const count = contacts.filter(c => c.currentStage === idx + 1).length;
            const Icon = stage.icon;
            return (
              <div 
                key={idx} 
                onClick={() => setSelectedStageIdx(idx)}
                className="group cursor-pointer relative bg-[#121214]/80 backdrop-blur-md border border-white/5 rounded-xl p-5 flex flex-col items-center text-center hover:border-emerald-500/40 hover:bg-white/[0.04] hover:-translate-y-1 transition-all duration-300 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)]"
              >
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 group-hover:bg-emerald-500/20 text-emerald-500 shadow-inner">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-[12px] sm:text-sm font-bold text-[#E5E5E7] mb-1 leading-tight">{stage.title}</h3>
                <p className="text-[11px] text-white/50 font-medium tracking-wide">
                  <span className="text-emerald-400 font-bold text-sm">{count}</span> জন সদস্য
                </p>
              </div>
            );
          })}`;

if (content.includes(oldMapping)) {
  content = content.replace(oldMapping, newMapping);
} else {
  // Try regex replace if exact spacing differs
  content = content.replace(/\{BENGALI_STAGES\.map\(\(stage, idx\) => \{[\s\S]*?\}\)\}/, newMapping);
}

// 3. Add the Modal code inside the main div
const modalCode = `

      <Dialog open={selectedStageIdx !== null} onOpenChange={(open) => !open && setSelectedStageIdx(null)}>
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col bg-[#0F0F12] border-white/10">
          {selectedStageIdx !== null && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 text-xl text-[#E5E5E7]">
                  {(() => {
                    const Icon = BENGALI_STAGES[selectedStageIdx].icon;
                    return (
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                        <Icon className="w-5 h-5" />
                      </div>
                    );
                  })()}
                  {BENGALI_STAGES[selectedStageIdx].title}
                </DialogTitle>
                <DialogDescription className="text-white/60">
                  এই ধাপে মোট <strong className="text-emerald-400">{contacts.filter(c => c.currentStage === selectedStageIdx + 1).length}</strong> জন সদস্য আছেন।
                </DialogDescription>
              </DialogHeader>
              <div className="overflow-y-auto py-2 flex-1 pr-2 space-y-2 mt-4">
                {contacts.filter(c => c.currentStage === selectedStageIdx + 1).length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
                    <p className="text-white/40 text-sm">এই ধাপে বর্তমানে কোনো সদস্য নেই।</p>
                  </div>
                ) : (
                  contacts.filter(c => c.currentStage === selectedStageIdx + 1).map(contact => (
                    <Link 
                      key={contact.id} 
                      to={\`/contacts/\${contact.id}\`}
                      className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] hover:border-emerald-500/30 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-[10px] font-bold">
                          {contact.name.substring(0,2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#E5E5E7] group-hover:text-emerald-400 transition-colors">{contact.name}</p>
                          <p className="text-[10px] text-white/40 mt-0.5">{contact.area || 'Unknown area'}</p>
                        </div>
                      </div>
                      <div className="text-white/20 group-hover:text-emerald-500 transition-colors">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
`;

// Insert just before the closing </div> of the main return block
content = content.replace(/    <\/div>\s*<\/div>\s*\);\s*\}/, modalCode + '    </div>\n    </div>\n  );\n}');

fs.writeFileSync('src/pages/Dashboard.tsx', content);
