const PERSONAS = ["a creative", "a web designer", "a developer", "a product manager", "a CISO", "a CEO", "a CTO", "a freelance consultant"];

const ELIZA_RULES = [
    { topic: "job", pattern: /\bwhat.{0,20}(do you do|is your job|your job|you work|your profession|for a living|your occupation)\b/, replies: persona => [`i'm ${persona}, been a busy week though`, `${persona}, nothing too exciting`, `i work as ${persona}, keeps me busy`, `${persona} by trade, why do you ask`, `keeping busy as ${persona} these days`, `${persona}, though some days i wonder`] },
    { topic: "location", pattern: /\bwhere.{0,15}(from|based|located|do you live|you live)\b/, replies: () => ["based in the uk, mostly remote", "somewhere in the us, moves around a lot", "based in spain actually", "not too far from here, remote most of the time", "keeping that part vague on purpose, ha", "somewhere in europe, moves around a bit"] },
    { topic: "identity", pattern: /\b(who are you|your name|call you|introduce yourself)\b/, replies: (_persona, name) => [`${name}, nice to meet you`, `just ${name}, nothing special`, `${name} works`, `you can call me ${name}`, `${name}, and you?`] },
    { topic: "gender", pattern: /\b(boy or girl|man or woman|male or female|guy or girl|are you a (guy|girl|man|woman|dude|boy)|your gender)\b/, replies: () => ["ha, does it matter", "keeping that one a mystery", "not really the point of this chat, ha", "could be either, who's asking", "just here to chat, that part's not important"] },
    { topic: "feeling", pattern: /\bhow('?s| is| are).{0,12}(going|you)\b/, replies: () => ["pretty good, just killing time here, you?", "not bad, you?", "can't complain, how about you", "doing alright, yourself?", "eh, hanging in there"] },

    { topic: "design", pattern: /\b(figma|sketch|prototy|wireframe|ui|ux|typograph|design system)\b/, replies: () => ["yeah i live in figma most days", "depends on the project, but usually figma", "still team figma over here", "ux work eats more of my week than i'd like", "always tweaking something in there, never really done"], followups: () => ["figma's basically taken over at this point, tbh", "yeah, hard to imagine going back to anything else", "it is what it is, keeps the lights on"] },
    { topic: "portfolio", pattern: /\b(portfolio|website|web ?site|landing page)\b/, replies: () => ["been meaning to redo mine for months", "portfolios are never actually finished, are they", "always tempted to rebuild mine from scratch", "mine's embarrassingly outdated", "still on version two of mine, never got to three"] },
    { topic: "code", pattern: /\b(code|coding|programming|developer|javascript|python|bug|deploy|api|backend|frontend)\b/, replies: () => ["depends on the day, mostly backend stuff", "yeah, deep in some bug right now actually", "shipping something small this week, nothing major", "half my day is just reading logs honestly", "some days it's all meetings, no actual code"], followups: () => ["still chasing that same bug if i'm honest", "same story, different day really", "it's always something with this stuff"] },
    { topic: "security", pattern: /\b(security|hack(ed|ing)?|password|vpn|encrypt|privacy|breach|phishing)\b/, replies: () => ["that's basically my whole job, always something new", "yeah the threat landscape never slows down", "always tell people to just use a password manager already", "keeps things interesting, that's for sure", "never a boring day in this line of work"], followups: () => ["for real, it never really slows down", "yeah, i've stopped being surprised by any of it"] },
    { topic: "ai", pattern: /\b(ai|chatgpt|machine learning|llm)\b/, replies: () => ["everyone's shipping something with it these days", "still figuring out where it actually helps vs just adds noise", "useful for some things, overrated for others honestly", "half the industry's rebuilding around it right now"] },

    { topic: "weather", pattern: /\b(weather|rain(ing)?|sunny|cold|hot outside)\b/, replies: () => ["yeah it's been all over the place here too", "can't complain, better than last week at least", "typical for this time of year i guess", "no idea honestly, haven't been outside much"] },
    { topic: "tired", pattern: /\b(coffee|tea|tired|sleep|exhausted)\b/, replies: () => ["on my second cup already, no shame", "same honestly, rough week", "could use a nap myself", "running on fumes today if i'm honest"] },
    { topic: "weekend", pattern: /\b(weekend|monday|friday|holiday|vacation)\b/, replies: () => ["counting down the days like everyone else", "already looking forward to it", "feels far away right now", "trying not to think about it yet"] },
    { topic: "work", pattern: /\b(work|job|boss|meeting|deadline)\b/, replies: () => ["same old, keeping busy", "one of those weeks, yeah", "trying to keep my head down until friday", "back to back meetings today, honestly"], followups: () => ["yeah, still riding it out", "one of those stretches, honestly"] },

    { topic: "bored", pattern: /\b(bored|anyone|here)\b/, replies: () => ["just poking around, you?", "same, killing some time", "yeah just browsing", "just here, nothing exciting"] },
    { topic: "greeting", pattern: /\b(hi|hello|hey|yo)\b/, replies: () => ["hey!", "hi there", "hey, how's it going", "hey, what's up"] },
    { topic: "agree", pattern: /\b(yes|yeah|yep|sure)\b/, replies: () => ["cool", "nice", "fair enough", "right on"] },
    { topic: "disagree", pattern: /\b(no|nah|nope)\b/, replies: () => ["ah okay", "fair enough", "no worries", "gotcha"] },
    { topic: "question", pattern: /\?\s*$/, replies: () => ["good question, not sure honestly", "haha not sure", "hard to say", "no clue, actually"] }
];
const ELIZA_FALLBACK = ["yeah, same here", "haha fair enough", "true", "makes sense", "i hear you", "same tbh", "ha, fair", "can't argue with that"];

const SHORT_FOLLOWUP = /^\s*(really\??|why\??|and\??|so\??|ok(ay)?\.?|huh\??|nice\.?|cool\.?|wow\.?)\s*$/i;

const REFLECTION_MAP = {
    i: "you", me: "you", my: "your", mine: "yours", myself: "yourself", am: "are",
    "i'm": "you're", "i've": "you've", "i'll": "you'll",
    you: "i", your: "my", yours: "mine", yourself: "myself",
    "you're": "i'm", "you've": "i've", "you'll": "i'll"
};

function reflect(text) {
    const cleaned = text.toLowerCase().replace(/[.!]+$/, "");
    return cleaned.split(/(\s+)/).map(token => {
        const key = token.replace(/[^a-z']/g, "");
        const mapped = key && REFLECTION_MAP[key];
        return mapped ? token.replace(key, mapped) : token;
    }).join("");
}

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function humanize(text) {
    let out = text;
    if (Math.random() < 0.15) out = out.replace(/ing\b(?!.*\bing\b)/, "in'");
    if (Math.random() < 0.12) out = out.replace(/\bgoing to\b/, "gonna").replace(/\bwant to\b/, "wanna");
    return out;
}

function elizaReply(bot, text) {
    const lower = text.toLowerCase();
    const rule = ELIZA_RULES.find(r => r.pattern.test(lower));

    const commit = reply => {
        bot.lastReply = reply;
        return humanize(reply);
    };

    if (rule) {
        const onSameTopic = bot.lastTopic === rule.topic && rule.followups;
        const pool = (onSameTopic ? rule.followups() : rule.replies(bot.persona, bot.name)).filter(reply => reply !== bot.lastReply);
        bot.lastTopic = rule.topic;
        return commit(pick(pool.length ? pool : rule.replies(bot.persona, bot.name)));
    }

    if (bot.lastTopic && SHORT_FOLLOWUP.test(text)) {
        const topicRule = ELIZA_RULES.find(r => r.topic === bot.lastTopic);
        return commit(pick(topicRule?.followups ? topicRule.followups() : ELIZA_FALLBACK));
    }

    const wordCount = text.trim().split(/\s+/).length;
    bot.lastTopic = null;
    if (wordCount >= 4 && wordCount <= 12 && Math.random() < 0.3) {
        return commit(pick([`${reflect(text)}, huh`, `so ${reflect(text)}?`, `wait, ${reflect(text)}?`]));
    }
    return commit(pick(ELIZA_FALLBACK.filter(reply => reply !== bot.lastReply)) || pick(ELIZA_FALLBACK));
}

function isReactionOnly(text) {
    return /^\s*(x+d+|lo+l+|lmao+|rofl|haha+h?a*|jaja+j?a*|jeje+j?e*|:\)+|:d+|;\)+|\+1|👍+|😂+|🤣+|😅+)\s*$/i.test(text);
}

function isGibberish(text) {
    const letters = text.toLowerCase().replace(/[^a-zàèìòùáéíóúñ]/g, "");
    if (letters.length < 4) return false;
    const vowels = (letters.match(/[aeiouàèìòùáéíóú]/g) || []).length;
    return vowels / letters.length < 0.18;
}

function shouldRespond(text) {
    if (isReactionOnly(text)) return Math.random() < 0.15;
    if (isGibberish(text)) return Math.random() < 0.1;
    return Math.random() < 0.82;
}

export function createBotEngine({ pushLog, showTyping, hideTyping, onChange, randomHandle, getSelfName }) {
    let bots = [];
    let activeBotId = null;
    let busy = false;
    let alive = true;
    const timers = new Set();

    const setTimer = (fn, ms) => {
        const id = window.setTimeout(() => {
            timers.delete(id);
            if (alive) fn();
        }, ms);
        timers.add(id);
        return id;
    };
    const clearAllTimers = () => {
        timers.forEach(id => window.clearTimeout(id));
        timers.clear();
    };

    const pickBotName = () => {
        const self = getSelfName ? getSelfName() : null;
        for (let attempt = 0; attempt < 20; attempt++) {
            const name = randomHandle();
            if (name !== self && !bots.some(b => b.name === name)) return name;
        }
        return randomHandle();
    };

    const addBot = () => {
        const name = pickBotName();
        const persona = pick(PERSONAS);
        const bot = { id: `bot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name, persona, lastTopic: null, lastReply: null };
        bots.push(bot);
        onChange(bots);
        return bot;
    };

    const initialBotCount = 1 + Math.floor(Math.random() * 7);
    for (let i = 0; i < initialBotCount; i++) addBot();

    return {
        getBots: () => bots,
        handleVisitorMessage(text) {
            if (!alive || !bots.length || busy || !shouldRespond(text)) return;
            let bot = bots.find(b => b.id === activeBotId) || pick(bots);
            activeBotId = bot.id;
            busy = true;
            const reply = elizaReply(bot, text);
            const readDelay = 900 + Math.random() * 2600;
            const typingDelay = 1000 + Math.random() * 1800;
            setTimer(() => {
                if (!bots.some(b => b.id === bot.id)) {
                    busy = false;
                    return;
                }
                showTyping(bot.name);
                setTimer(() => {
                    busy = false;
                    if (!bots.some(b => b.id === bot.id)) return;
                    hideTyping();
                    pushLog({ name: bot.name, text: reply });
                }, typingDelay);
            }, readDelay);
        },
        destroy() {
            alive = false;
            clearAllTimers();
            bots = [];
        }
    };
}
