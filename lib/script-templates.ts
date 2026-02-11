export interface ScriptTemplate {
  id: string
  title: string
  category: 'marketing' | 'education' | 'business' | 'social'
  estimatedDuration: string
  description: string
  script: string
  structurePrompt: string
}

export const TEMPLATE_CATEGORIES = {
  marketing: 'Marketing',
  education: 'Education',
  business: 'Business',
  social: 'Social Media',
} as const

export const scriptTemplates: ScriptTemplate[] = [
  // Marketing
  {
    id: 'product-demo',
    title: 'Product Demo',
    category: 'marketing',
    estimatedDuration: '~60s',
    description: 'Introduce your product\'s key features and benefits',
    structurePrompt: 'Relatable problem question → Product introduction → 3 key features/benefits → Social proof (user count) → CTA (free trial)',
    script: `Have you ever wished there was a better way to handle your daily workflow? Meet our product — the all-in-one solution designed to save you time and effort.

Here's what makes it special. First, it's incredibly easy to set up. You can be up and running in under five minutes. Second, it integrates with the tools you already use, so there's no learning curve. And third, our smart automation handles the repetitive tasks so you can focus on what matters.

Don't just take our word for it — thousands of teams have already made the switch and seen results in their first week. Ready to see what it can do for you? Start your free trial today.`,
  },
  {
    id: 'testimonial',
    title: 'Customer Testimonial',
    category: 'marketing',
    estimatedDuration: '~45s',
    description: 'Share a customer success story',
    structurePrompt: 'Pain point before the product → Discovery moment → Measurable result/improvement → Emotional highlight → Recommendation to others',
    script: `Before we found this solution, our team was spending hours every week on manual processes. It was frustrating, and we knew there had to be a better way.

That's when we discovered this tool. Within the first month, we cut our processing time by sixty percent. Our team finally had time to focus on creative work instead of busywork.

The best part? The support team was there every step of the way. If you're on the fence, just try it. You'll wonder how you ever managed without it.`,
  },
  {
    id: 'social-ad',
    title: 'Social Media Ad',
    category: 'marketing',
    estimatedDuration: '~30s',
    description: 'Short, punchy ad for social platforms',
    structurePrompt: 'Scroll-stopping hook → Bold promise → Quick proof/social proof → Urgent CTA',
    script: `Stop scrolling — this is going to change how you work. Imagine finishing your entire to-do list before lunch. Sounds impossible? Not anymore.

Our tool automates the boring stuff so you can do more of what you love. Over fifty thousand people already use it every day. Join them — sign up free and see the difference in minutes.`,
  },
  // Education
  {
    id: 'tutorial',
    title: 'Tutorial Walkthrough',
    category: 'education',
    estimatedDuration: '~90s',
    description: 'Step-by-step how-to guide',
    structurePrompt: 'Welcome + what you\'ll learn → Step 1 with detail → Step 2 with detail → Step 3 with detail → Summary + what to do if stuck → Outro',
    script: `Welcome to this step-by-step tutorial. Today I'm going to walk you through the entire process from start to finish, and by the end, you'll be able to do this on your own with confidence.

Let's start with the basics. Step one — open your dashboard and navigate to the settings panel. You'll see a list of options on the left side. Click on the one labeled "Configuration."

Step two — you'll need to enter your details in the form that appears. Fill in each field carefully. Don't worry if you're unsure about something — hover over the question mark icon next to each field for a helpful tooltip.

Step three — once everything is filled in, click the "Save" button at the bottom. You should see a green confirmation message.

And that's it! You've completed the setup. If you run into any issues, check out the troubleshooting guide linked in the description below. Thanks for watching, and I'll see you in the next tutorial.`,
  },
  {
    id: 'explainer',
    title: 'Concept Explainer',
    category: 'education',
    estimatedDuration: '~60s',
    description: 'Break down a complex topic simply',
    structurePrompt: 'Acknowledge the confusion → Simple analogy/metaphor → Why it matters → Key takeaway in one sentence',
    script: `Let's break down a concept that confuses a lot of people, but is actually simpler than you think.

Think of it like this — imagine you have a filing cabinet. Every time you add a new document, you put it in a specific drawer based on its category. That's essentially how this system works. Information comes in, gets categorized automatically, and goes exactly where it needs to be.

The reason this matters is efficiency. Without a system like this, you'd spend all your time searching for things instead of using them. With it, everything is organized and accessible in seconds.

The key takeaway? Organization isn't just about being tidy — it's about working smarter. And now you understand exactly how this concept makes that possible.`,
  },
  {
    id: 'course-intro',
    title: 'Course Introduction',
    category: 'education',
    estimatedDuration: '~45s',
    description: 'Welcome students to your course',
    structurePrompt: 'Warm welcome → What the course covers → How modules are structured → Prerequisites → Encouragement to get started',
    script: `Welcome to the course! I'm so glad you're here. Over the next few weeks, we're going to cover everything you need to know to master this subject from the ground up.

Here's what you can expect. Each module is designed to build on the last, so by the end, you'll have a complete understanding of the topic. We'll mix theory with hands-on practice so you can apply what you learn right away.

No prior experience is needed — just bring your curiosity and willingness to learn. Let's get started with Module One.`,
  },
  // Business
  {
    id: 'company-intro',
    title: 'Company Introduction',
    category: 'business',
    estimatedDuration: '~60s',
    description: 'Present your company mission and values',
    structurePrompt: 'Origin story/founding question → Mission statement → Scale and reach → Key differentiator → Invitation to connect',
    script: `We started with a simple question — why is this so hard? Every business we talked to had the same problem, and nobody had a good solution. So we decided to build one.

Our company was founded on the belief that powerful tools should be accessible to everyone, not just enterprises with big budgets. Today, we serve over ten thousand businesses across forty countries, and we're just getting started.

What sets us apart is our commitment to simplicity. We believe the best technology is the kind you barely notice because it just works. Our team of engineers and designers obsess over every detail so you don't have to.

We'd love to show you what we can do for your business. Let's connect.`,
  },
  {
    id: 'team-update',
    title: 'Team Update',
    category: 'business',
    estimatedDuration: '~45s',
    description: 'Share news and progress with your team',
    structurePrompt: 'Casual greeting → Good news/win → Process or policy update → Upcoming event/reminder → Closing encouragement',
    script: `Hey team, here's a quick update on where we stand this week.

First, great news — we hit our quarterly target two weeks early. That's a direct result of the hard work everyone has been putting in, and it hasn't gone unnoticed.

Second, we're rolling out a new process starting next Monday. You'll receive detailed instructions by email, but the short version is that it's going to save everyone about two hours per week.

Finally, a reminder that our team offsite is coming up next month. Make sure to RSVP by Friday. Looking forward to seeing everyone there. Keep up the great work!`,
  },
  {
    id: 'investor-pitch',
    title: 'Investor Pitch',
    category: 'business',
    estimatedDuration: '~90s',
    description: 'Pitch your startup to potential investors',
    structurePrompt: 'Big problem statement → Solution overview → Market size opportunity → Traction/metrics → 3 competitive advantages → The ask/raise → Invitation to join',
    script: `Every year, businesses lose billions of dollars to inefficiency. We're here to change that.

Our platform uses artificial intelligence to automate the workflows that cost companies the most time and money. We're not talking about small improvements — our customers see an average forty percent reduction in operational costs within the first ninety days.

The market opportunity is massive. The workflow automation space is projected to reach two hundred billion dollars by 2028, and we're positioned to capture a significant share. Our product is already used by over five hundred companies, with revenue growing thirty percent month over month.

What makes us different? Three things. First, our AI learns and adapts to each company's unique processes. Second, we integrate with every major tool in the ecosystem. Third, our customers stay — we have a ninety-seven percent retention rate.

We're raising our Series A to accelerate growth and expand into new markets. We'd love to have you join us on this journey.`,
  },
  // Social Media
  {
    id: 'tiktok-reel',
    title: 'TikTok / Reel',
    category: 'social',
    estimatedDuration: '~15s',
    description: 'Quick, engaging hook for short-form',
    structurePrompt: 'Attention-grabbing hook → One actionable tip or insight → Quick result promise → CTA (try it)',
    script: `Here's a productivity hack that nobody talks about. Instead of making a to-do list, try this — pick your three most important tasks before bed, and do them first thing in the morning. You'll get more done by noon than most people do all day. Try it tomorrow.`,
  },
  {
    id: 'youtube-intro',
    title: 'YouTube Intro',
    category: 'social',
    estimatedDuration: '~30s',
    description: 'Channel introduction and subscribe CTA',
    structurePrompt: 'Value proposition for the viewer → What kind of content the channel makes → Upload schedule → Subscribe CTA → Transition to today\'s topic',
    script: `If you're looking to level up your skills and stay ahead of the curve, you're in the right place. On this channel, we break down the latest trends, share practical tips, and give you the tools you need to succeed.

New videos drop every week, so make sure you hit that subscribe button and turn on notifications so you never miss an update. Let's dive into today's topic.`,
  },
  {
    id: 'announcement',
    title: 'Announcement',
    category: 'social',
    estimatedDuration: '~30s',
    description: 'Announce a launch, event, or milestone',
    structurePrompt: 'Excitement/big news teaser → What\'s being announced → Why it matters (listener feedback) → Where to find it → Ask for reactions',
    script: `Big news — we've been working on something special behind the scenes, and it's finally here. Today, we're officially launching our newest feature, and it's going to change the way you work.

We listened to your feedback, and this is what you asked for. Head over to our website to check it out and be one of the first to try it. Link is in the bio. Let us know what you think!`,
  },
]

export function getTemplatesByCategory(category: string): ScriptTemplate[] {
  return scriptTemplates.filter((t) => t.category === category)
}

export function getTemplateById(id: string): ScriptTemplate | undefined {
  return scriptTemplates.find((t) => t.id === id)
}
