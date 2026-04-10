// දැනට ඔයා ගාව තියෙන install සහ fetch listeners
self.addEventListener('install', e => {
  console.log('SW installed');
  self.skipWaiting(); // අලුත් SW එකක් ආපු ගමන් active වෙන්න
});

self.addEventListener('fetch', e => {
  e.respondWith(fetch(e.request));
});

// --- මම අලුතෙන් දීපු Background Notification Logic එක ---

let userSettings = null;
let currentStatus = 'OUT';

// App එකෙන් එවන දත්ත (Settings/Status) ලබාගන්න
self.addEventListener('message', (event) => {
    if (event.data.type === 'SET_CONFIG') {
        userSettings = event.data.settings;
        currentStatus = event.data.status;
    }
});

// විනාඩියකට සැරයක් වෙලාව චෙක් කරන්න
setInterval(() => {
    checkAndNotify();
}, 60000);

function checkAndNotify() {
    // සෙටින්ග්ස් නැත්නම් හෝ දැනටමත් වැඩ (IN) නම් නොටිෆිකේෂන් එපා
    if (!userSettings || !userSettings.reminderOn || currentStatus === 'IN') return;

    const now = new Date();
    const info = calculateShift(now);
    
    if (info.plan === "OFF") return;

    const [exH, exM] = info.expected.split(':').map(Number);
    const expTotal = exH * 60 + exM;
    const nowTotal = now.getHours() * 60 + now.getMinutes();

    // හරියටම විනාඩි 5කට කලින් alert එක යවනවා
    if (expTotal - nowTotal === 5) {
        self.registration.showNotification("Punch In Reminder ⏱️", {
            body: `${info.plan} Shift එක තව විනාඩි 5 කින් පටන් ගන්නවා. අමතක නොකර Punch කරන්න!`,
            badge: 'https://img.icons8.com/ios-filled/50/000000/clock--v1.png',
            vibrate: [200, 100, 200],
            tag: 'shift-reminder' // එකම නොටිෆිකේෂන් එක දෙපාරක් එන එක නවත්තන්න
        });
    }
}

// ෂිෆ්ට් එක ගණනය කරන ලොජික් එක (App එකේ තියෙන එකමයි)
function calculateShift(targetDate) {
    if(!userSettings) return { plan: "OFF" };
    const type = userSettings.shiftType || 'GEN';
    const startDay = parseInt(userSettings.startDay || '1');
    const dayOfWeek = targetDate.getDay(); 
    const refDate = new Date(2024, 0, 1);
    const diffDays = Math.floor((targetDate - refDate) / 86400000);
    let plan = "OFF", expected = "08:30";

    if (type === 'GEN') {
        if (dayOfWeek !== 0) { plan = "GENERAL"; expected = "08:30"; }
    } else if (type === '12A') {
        let pos = (dayOfWeek - startDay + 7) % 7;
        if (pos < 2) { plan = "DAY"; expected = "06:00"; }
        else if (pos < 4) { plan = "NIGHT"; expected = "18:00"; }
    } else if (type === '12B') {
        let pos = ((diffDays - startDay) % 6 + 6) % 6;
        if (pos < 2) { plan = "DAY"; expected = "06:00"; }
        else if (pos < 4) { plan = "NIGHT"; expected = "18:00"; }
    } else if (type === '8H') {
        let pos = ((diffDays - startDay) % 7 + 7) % 7;
        if (pos < 2) { plan = "NIGHT"; expected = "22:00"; }
        else if (pos < 4) { plan = "EVENING"; expected = "14:00"; }
        else if (pos < 6) { plan = "MORNING"; expected = "06:00"; }
    }
    return { plan, expected };
}
