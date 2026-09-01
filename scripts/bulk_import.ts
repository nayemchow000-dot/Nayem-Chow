import 'dotenv/config';
import { db } from '../src/db/db';
import { contacts } from '../src/db/schema';
import { eq } from 'drizzle-orm';

const rawMembers = `
1. Name: সাব্বির ভাই, Phone: 01914-725938, Address/Area: ছোট আলামপুর
2. Name: রবিউল ভাই, Phone: 01840-025387, Address/Area: বড় আলামপুর
3. Name: রাজিন ভাই, Phone: 01608-266042, Address/Area: গন্দমতী
4. Name: তন্ময় ভাই, Phone: 01736-943585, Address/Area: রামপুর
5. Name: নাঈম ভাই, Phone: 01869090345, Address/Area: গন্দমতী
6. Name: তাহসিন ভাই, Phone: 01615-887613, Address/Area: রামপুর
7. Name: সানি ভাই, Phone: 01749-361373, Address/Area: গন্দমতী
8. Name: আয়মান ভাই, Phone: 01345-634268, Address/Area: গন্দমতী
9. Name: জনি ভাই, Phone: 01824-172602, Address/Area: হাউজিং
10. Name: বরকত ভাই, Phone: 01790-296998, Address/Area: গন্দমতী
11. Name: নিহাদ ভাই, Phone: 01858-041273, Address/Area: গন্দমতী
12. Name: রাকিব ভাই, Phone: 01611-656189, Address/Area: রামপুর মাঝেপাড়া
13. Name: জাকারিয়া ভাই, Phone: 01866758152, Address/Area: গন্দমতী
14. Name: ওমর ফারুক ভাই, Phone: 01622-022591, Address/Area: মণিপুর
15. Name: সাইফুল ভাই, Phone: 01847-790520, Address/Area: রামপুর
16. Name: আশিক ভাই, Phone: 01622-710660, Address/Area: রামপুর
17. Name: আমিন স্যার, Phone: 01816-076432, Address/Area: রামপুর
18. Name: কায়সার ভাই, Phone: 01927-227928, Address/Area: রামপুর
19. Name: হাসান ভাই, Phone: 01917-245790, Address/Area: গন্দমতী
20. Name: কাইজার ভাই, Phone: 01918-710238, Address/Area: রামপুর
21. Name: সাইফুল ভাই, Phone: 01976-078972, Address/Area: রামপুর
22. Name: নাবিল, Phone: 01814-781583, Address/Area: গন্দমতী
23. Name: সাফফান ভাই, Phone: 01622124288, Address/Area: Not specified
24. Name: শুভ ভাই, Phone: 01813929710, Address/Area: নন্দনপুর
25. Name: জুবায়ের, Phone: 01614178182, Address/Area: গন্দমতী
26. Name: হোসাইন, Phone: 01600668390, Address/Area: গন্দমতী
27. Name: তানভির, Phone: 01842-236787, Address/Area: গন্দমতী
28. Name: জিহাদ, Phone: 01627-506904, Address/Area: রামপুর
29. Name: ইফতিখার, Phone: 01615-837344, Address/Area: রামপুর
30. Name: রিফাত ভাই, Phone: 01715-516275, Address/Area: রামপুর
31. Name: রিয়াদ ভাই কু.ভা., Phone: 01720-852690, Address/Area: কেম্ব্রিয়ান হোস্টেল
32. Name: হাসিব ভাই, Phone: 01816-278991, Address/Area: কুমিল্লা
33. Name: মিশাল ভাই, Phone: 01613-811431, Address/Area: গন্দমতী
34. Name: আহসান ভাই, Phone: 01857-592509, Address/Area: গন্দমতী
35. Name: জীবন ভাই, Phone: 01624-796417, Address/Area: রামপুর
36. Name: শুভ ভাই, Phone: 01887-353896, Address/Area: নন্দনপুর
37. Name: বাপ্পি ভাই, Phone: 01848-212849, Address/Area: গন্দমতী
38. Name: বিজয় ভাই, Phone: 01981-436583, Address/Area: গন্দমতী
39. Name: ইয়াসিন ভাই, Phone: 01516-739430, Address/Area: চাঙ্গেনে
40. Name: বাপ্পি ছোটভাই, Phone: 01860-806544, Address/Area: গন্দমতী
41. Name: তাওহীদ ভাই, Phone: 01717-877159, Address/Area: কুমিল্লা
42. Name: তাউসিফ ছোটভাই, Phone: 01811-904980, Address/Area: গন্দমতী
43. Name: মাহমুদ ভাই, Phone: 01647-603973, Address/Area: গন্দমতী
44. Name: আমির হামজা ভাই, Phone: 01750-486885, Address/Area: গন্দমতী
45. Name: ওমর ইমতিয়াজ ভাই, Phone: 01868-693738, Address/Area: গন্দমতী
46. Name: সাকিব ছোটভাই, Phone: 01635-400688, Address/Area: গন্দমতী
47. Name: তানিম ভাই, Phone: 01892-788421, Address/Area: রামপুর
48. Name: আসিফ ভাই, Phone: 01646-398434, Address/Area: রামপুর
49. Name: আয়মান ভাই, Phone: 01860-483789, Address/Area: গন্দমতী
50. Name: বিজয় ভাই, Phone: 01981-436583, Address/Area: গন্দমতী
51. Name: জাবের ভাই, Phone: 01571-053753, Address/Area: হাউজিং
52. Name: মিরাজ ভাই, Phone: 01632310581, Address/Area: রামপুর
53. Name: মুসা ভাই, Phone: 01874-573771, Address/Area: হাউজিং
54. Name: সামির ছোটভাই, Phone: 01982-998930, Address/Area: Not specified
55. Name: সিহান ছোটভাই, Phone: 01635-381527, Address/Area: Not specified
56. Name: সিয়াম ভাই, Phone: 01606-958474, Address/Area: Not specified
57. Name: সিফাত ছোটভাই, Phone: 01871-978303, Address/Area: Not specified
`;

async function runImport() {
  const lines = rawMembers.trim().split('\n').filter(line => line.trim() !== '');
  
  const parsedMembers = lines.map(line => {
    // Basic extraction
    const match = line.match(/\d+\.\s+Name:\s+(.+?),\s+Phone:\s+(.+?),\s+Address\/Area:\s+(.+)/);
    if (!match) {
      console.warn('Failed to parse line:', line);
      return null;
    }
    return {
      name: match[1].trim(),
      phone: match[2].trim(),
      area: match[3].trim()
    };
  }).filter(Boolean);

  let totalParsed = parsedMembers.length;
  let uniqueCount = 0;
  let duplicateInInput = 0;
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let duplicateInDb = 0;

  // Deduplicate input primarily by phone
  const uniqueMap = new Map();
  for (const m of parsedMembers as any[]) {
    if (uniqueMap.has(m.phone)) {
      duplicateInInput++;
      // check if area is better in the current one
      const existing = uniqueMap.get(m.phone);
      if ((!existing.area || existing.area === 'Not specified') && m.area && m.area !== 'Not specified') {
        uniqueMap.set(m.phone, m);
      }
    } else {
      uniqueMap.set(m.phone, m);
    }
  }

  const uniqueMembers = Array.from(uniqueMap.values());
  uniqueCount = uniqueMembers.length;

  console.log(`Starting bulk import...`);
  console.log(`Total lines parsed: ${totalParsed}`);
  console.log(`Duplicate phones in input list: ${duplicateInInput}`);
  console.log(`Unique members to process: ${uniqueCount}`);

  for (const member of uniqueMembers) {
    try {
      // Find existing contact by phone
      const existing = await db.select().from(contacts).where(eq(contacts.phone, member.phone));
      
      if (existing && existing.length > 0) {
        // Exists in DB
        const dbContact = existing[0];
        if (existing.length > 1) {
           duplicateInDb++;
        }
        
        const dbArea = dbContact.area;
        const newArea = member.area;
        
        // If the new area is better, update
        if (newArea && newArea !== 'Not specified' && (!dbArea || dbArea.trim() === '' || dbArea === 'Not specified')) {
          await db.update(contacts)
            .set({ area: newArea, updatedAt: new Date() })
            .where(eq(contacts.id, dbContact.id));
          updated++;
          console.log(`[UPDATED] ${member.name} (${member.phone}) - Area set to: ${newArea}`);
        } else {
          skipped++;
          console.log(`[SKIPPED] ${member.name} (${member.phone}) - Already up to date.`);
        }
      } else {
        // New contact
        const actualArea = member.area === 'Not specified' ? null : member.area;
        await db.insert(contacts).values({
          name: member.name,
          phone: member.phone,
          area: actualArea,
          firstContactDate: new Date().toISOString(), // Use today as first contact date
          currentStage: 1,
          growthScore: 0,
          priorityLevel: 'stable',
        });
        inserted++;
        console.log(`[INSERTED] ${member.name} (${member.phone})`);
      }
    } catch (err) {
      console.error(`Error processing ${member.name}:`, err);
    }
  }

  console.log('--- IMPORT REPORT ---');
  console.log(`Total supplied: ${totalParsed}`);
  console.log(`Duplicate entries in input: ${duplicateInInput}`);
  console.log(`Expected unique: ${uniqueCount}`);
  console.log(`Inserted new: ${inserted}`);
  console.log(`Updated existing: ${updated}`);
  console.log(`Skipped existing (no change): ${skipped}`);
  if (duplicateInDb > 0) {
    console.log(`NOTE: Found ${duplicateInDb} existing phone numbers that had multiple DB entries (used the first one).`);
  }
  
  process.exit(0);
}

runImport();
