const fs = require('fs');
let lines = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8').split('\n');

const importsToReplace = `import { ArrowRight, Flame, Target, UserPlus, TrendingUp, TrendingDown, Minus, Edit2 } from 'lucide-react';`;
const newImports = `import { ArrowRight, Flame, Target, UserPlus, MessageCircle, ThumbsUp, PhoneCall, ArrowUpCircle, Home, Users, Sunrise, BookOpen, Library, Link as LinkIcon, Flag, TrendingUp, TrendingDown, Minus, Edit2, Heart, Megaphone, Star } from 'lucide-react';`;

const stagesData = `
  const BENGALI_STAGES = [
    { title: "নতুন পরিচিতি", icon: UserPlus },
    { title: "দাওয়াহ দেওয়া হয়েছে", icon: MessageCircle },
    { title: "ইতিবাচক সাড়া", icon: ThumbsUp },
    { title: "নিয়মিত যোগাযোগ", icon: PhoneCall },
    { title: "সালাতের উন্নতি", icon: ArrowUpCircle },
    { title: "মসজিদের সাথে সংযোগ", icon: Home },
    { title: "জামাতে অংশগ্রহণ", icon: Users },
    { title: "ফজরের সাথে সংযোগ", icon: Sunrise },
    { title: "কুরআন ও দ্বীনি শিক্ষা", icon: BookOpen },
    { title: "ইলমি মুহাজারা / পাঠচক্র", icon: Library },
    { title: "দাওয়াহ সার্কেলের সাথে সংযোগ", icon: LinkIcon },
    { title: "ফজর ক্যাম্পেইনে অংশগ্রহণ", icon: Flag },
    { title: "ব্যক্তিগত আমলের উন্নতি", icon: TrendingUp },
    { title: "চরিত্র ও পারিবারিক উন্নতি", icon: Heart },
    { title: "দাওয়াহ কাজে অংশগ্রহণ", icon: Megaphone },
    { title: "সক্রিয় দাওয়াহ কর্মী", icon: Star }
  ];
`;

const replaceWith = `        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {BENGALI_STAGES.map((stage, idx) => {
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
          })}
        </div>`;

// Find index of 'return ('
const returnIndex = lines.findIndex(l => l.includes('return ('));
lines.splice(returnIndex, 0, stagesData);

// Find index of grid-cols-1 md:grid-cols-4
const startIndex = lines.findIndex(l => l.includes('grid-cols-1 md:grid-cols-4'));
const endIndex = lines.findIndex(l => l.includes('grid-cols-1 lg:grid-cols-12 gap-8'));

lines.splice(startIndex, endIndex - startIndex, replaceWith);

let newContent = lines.join('\n');
newContent = newContent.replace(importsToReplace, newImports);

fs.writeFileSync('src/pages/Dashboard.tsx', newContent);
