const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

const stagesData = `  const BENGALI_STAGES = [
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

content = content.replace(stagesData, '');

// Insert at module level after imports
content = content.replace('export default function Dashboard() {', stagesData + '\nexport default function Dashboard() {');

fs.writeFileSync('src/pages/Dashboard.tsx', content);
