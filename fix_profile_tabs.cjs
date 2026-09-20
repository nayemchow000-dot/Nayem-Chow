const fs = require('fs');
let content = fs.readFileSync('src/pages/ContactProfile.tsx', 'utf8');

// Update imports
if (!content.includes('useSearchParams')) {
  content = content.replace("import { useParams, Link } from 'react-router';", "import { useParams, Link, useSearchParams } from 'react-router';");
}

// Add state for tab and parse from URL
const hookInjection = `  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';`;

content = content.replace('  const { id } = useParams();', hookInjection);

// Update Tabs component to be controlled
const tabsSearch = `<Tabs defaultValue="overview" className="w-full">`;
const tabsReplacement = `<Tabs value={activeTab} onValueChange={(val) => setSearchParams({ tab: val })} className="w-full">`;

if (content.includes(tabsSearch)) {
  content = content.replace(tabsSearch, tabsReplacement);
}

fs.writeFileSync('src/pages/ContactProfile.tsx', content);
