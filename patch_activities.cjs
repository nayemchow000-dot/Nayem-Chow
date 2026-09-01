const fs = require('fs');
let content = fs.readFileSync('src/pages/Activities.tsx', 'utf8');

const stagesData = `
const BENGALI_STAGES = [
  { title: "নতুন পরিচিতি", icon: Users },
  { title: "দাওয়াহ দেওয়া হয়েছে", icon: Edit2 },
  { title: "ইতিবাচক সাড়া", icon: CheckSquare },
  { title: "নিয়মিত যোগাযোগ", icon: Phone },
  { title: "সালাতের উন্নতি", icon: Sunrise },
  { title: "মসজিদের সাথে সংযোগ", icon: MapPin },
  { title: "জামাতে অংশগ্রহণ", icon: Users },
  { title: "ফজরের সাথে সংযোগ", icon: Sunrise },
  { title: "কুরআন ও দ্বীনি শিক্ষা", icon: BookOpen },
  { title: "ইলমি মুহাজারা / পাঠচক্র", icon: BookOpen },
  { title: "দাওয়াহ সার্কেলের সাথে সংযোগ", icon: Target },
  { title: "ফজর ক্যাম্পেইনে অংশগ্রহণ", icon: Sunrise },
  { title: "ব্যক্তিগত আমলের উন্নতি", icon: Target },
  { title: "চরিত্র ও পারিবারিক উন্নতি", icon: Users },
  { title: "দাওয়াহ কাজে অংশগ্রহণ", icon: Edit2 },
  { title: "সক্রিয় দাওয়াহ কর্মী", icon: Target }
];
`;

content = content.replace('export default function Activities() {', stagesData + '\nexport default function Activities() {');

// We need to change the 'Target Sectors' layout to show the 16 stages and their members.
const newSectorsView = `
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {BENGALI_STAGES.map((stage, idx) => {
              const stageMembers = allContacts.filter(c => c.currentStage === idx + 1);
              const Icon = stage.icon;
              return (
                <Card key={idx} className="flex flex-col h-full bg-[#121214]/80 backdrop-blur-md border-white/5 hover:border-emerald-500/20 transition-colors">
                  <CardHeader className="flex flex-row items-center gap-3 border-b border-white/5 pb-4 px-4 pt-4">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold text-[#E5E5E7]">{stage.title}</CardTitle>
                      <p className="text-[11px] text-white/50 font-mono mt-0.5">{stageMembers.length} জন সদস্য</p>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 p-0 flex flex-col">
                    <div className="flex-1 p-2 space-y-1 max-h-[250px] overflow-y-auto custom-scrollbar">
                      {stageMembers.length === 0 ? (
                        <p className="text-center text-white/30 text-xs py-6">কোনো সদস্য নেই</p>
                      ) : (
                        stageMembers.map(member => (
                          <div 
                            key={member.id}
                            onClick={() => window.location.href = '/contacts/' + member.id}
                            className="flex items-center gap-2 p-2 rounded-md hover:bg-white/5 cursor-pointer transition-colors group"
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50 group-hover:bg-emerald-400" />
                            <span className="text-xs text-white/70 group-hover:text-emerald-400 transition-colors">{member.name}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
`;

// Replace the <TabsContent value="sectors"... part
content = content.replace(/<div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-\[70vh\]">[\s\S]*?<\/TabsContent>/, newSectorsView + '        </TabsContent>');

fs.writeFileSync('src/pages/Activities.tsx', content);
