// Local demonstration content. Passwords are hashed before they are stored.
export const DEMO_ACCOUNTS = [
  { username: 'ana', password: 'fieldnotes-ana', displayName: 'Ana Reyes' },
  { username: 'paolo', password: 'fieldnotes-paolo', displayName: 'Paolo Cruz' },
];

// Keep the original content here so an older database can recognize unchanged examples.
const ORIGINAL_SAMPLE_POSTS = [
  {
    author: 'ana',
    createdAt: '2026-08-24T09:12:00.000Z',
    title: 'My first Lambda timed out, and the logs told me why',
    description: `I wrote a small function to resize the event posters our org uploads before they go on the website. On my laptop it finished in about five seconds for the biggest image, so I deployed it and moved on.

Every test invocation failed. I spent twenty minutes rereading my resize code before I finally opened CloudWatch Logs and saw the line "Task timed out after 3.00 seconds." A new Lambda function gets a three-second timeout by default, and mine simply needed longer.

I raised the timeout to 30 seconds. I also learned that the memory setting scales the CPU a function gets, so moving from 128 MB to 512 MB made each resize noticeably faster.

Lesson for next time: read the log line before rewriting the code.`,
    comments: [
      {
        author: 'paolo',
        createdAt: '2026-08-24T13:40:00.000Z',
        body: 'Same thing happened to me with a PDF export. Did the higher memory setting change your cost much?',
      },
      {
        author: 'ana',
        createdAt: '2026-08-24T15:05:00.000Z',
        body: 'Barely. Each run got shorter, which offset most of it. Worth testing a few memory sizes before settling.',
      },
    ],
  },
  {
    author: 'paolo',
    createdAt: '2026-08-29T02:30:00.000Z',
    title: 'SQLite ignored my foreign keys until I asked nicely',
    description: `For our database class project, deleting a student left their enrollment rows behind, even though the schema clearly said ON DELETE CASCADE.

It turns out SQLite keeps foreign key enforcement off by default for backward compatibility. You have to run PRAGMA foreign_keys = ON on every new connection, not just once.

I moved that line into our connection setup and wrote a tiny test that deletes a student and counts the leftover enrollments. It should print zero, and now it does.`,
    comments: [
      {
        author: 'ana',
        createdAt: '2026-08-29T06:18:00.000Z',
        body: 'Saving this. I would never have guessed that a constraint can exist in the schema and still do nothing.',
      },
    ],
  },
  {
    author: 'ana',
    createdAt: '2026-09-03T10:45:00.000Z',
    title: 'Hosting our event page on S3 without making the bucket public',
    description: `New S3 buckets have Block Public Access turned on, so my first upload returned 403 AccessDenied the moment I opened the page. Every tutorial I found said to switch it off.

Instead, I kept the bucket private and put CloudFront in front of it with origin access control, so only CloudFront can read the files. It also gave us HTTPS, which the S3 website endpoint does not offer.

One gotcha: with this setup you are using the bucket's regular endpoint, so set the distribution's default root object to index.html or the homepage comes back as an error.`,
    comments: [
      {
        author: 'paolo',
        createdAt: '2026-09-03T14:02:00.000Z',
        body: 'The default root object part got me too. How long did the first deployment take to show up?',
      },
      {
        author: 'ana',
        createdAt: '2026-09-03T14:30:00.000Z',
        body: 'A few minutes for the distribution itself. After that, updates needed an invalidation before they appeared.',
      },
      {
        author: 'paolo',
        createdAt: '2026-09-04T01:15:00.000Z',
        body: 'Good to know. I will try this for our hackathon landing page this weekend.',
      },
    ],
  },
  {
    author: 'paolo',
    createdAt: '2026-09-09T07:20:00.000Z',
    title: 'The CORS error that was really my auth middleware',
    description: `Our React app on port 5173 called our Express API on port 4000, and the browser kept reporting a CORS error. I added every header I could find and nothing changed.

The real problem was ordering. The browser sends an OPTIONS preflight before the actual request, and my authentication middleware ran first. It answered the preflight with 401 and no CORS headers, so the browser reported it as a CORS failure.

Moving the CORS middleware above authentication fixed it. Later we switched to the Vite dev proxy, so the browser only ever talks to one origin during development.`,
    comments: [
      {
        author: 'ana',
        createdAt: '2026-09-09T09:48:00.000Z',
        body: 'The Network tab showing the OPTIONS request is what finally made this click for me. Great write-up.',
      },
      {
        author: 'paolo',
        createdAt: '2026-09-09T10:10:00.000Z',
        body: 'Yes, filter by "Other" or show all request types, otherwise the preflight is easy to miss.',
      },
    ],
  },
  {
    author: 'ana',
    createdAt: '2026-09-15T03:05:00.000Z',
    title: 'Set a budget alert before you build anything',
    description: `Advice from our club mentor: before launching anything in a personal AWS account, create a budget in AWS Budgets with an email alert.

I set a small monthly budget with alerts for actual and forecasted spending. A week later the forecast alert arrived. I had left a NAT gateway running in a test VPC, and NAT gateways bill by the hour even when no traffic passes through them.

I deleted it, released the Elastic IP it was holding, and added "check the VPC console" to my end-of-lab checklist.`,
    comments: [
      {
        author: 'paolo',
        createdAt: '2026-09-15T05:22:00.000Z',
        body: 'This should be step zero in every workshop. Adding a checklist is a good habit too.',
      },
    ],
  },
  {
    author: 'paolo',
    createdAt: '2026-09-21T08:00:00.000Z',
    title: 'What small pull requests did for our capstone team',
    description: `During our first month, pull requests touched forty files and waited days for review. Nobody wanted to open them.

We agreed on three rules: one concern per pull request, keep it small enough to review in one sitting, and always include a short "how to test" section.

Reviews now usually happen the same afternoon. We also open draft pull requests early when we want feedback on an approach before polishing it.`,
    comments: [],
  },
  {
    author: 'ana',
    createdAt: '2026-09-28T11:30:00.000Z',
    title: 'Using the Well-Architected pillars as a capstone checklist',
    description: `Our study group read the AWS Well-Architected Framework as a set of review questions for our own capstone instead of exam material.

There are six pillars: operational excellence, security, reliability, performance efficiency, cost optimization, and sustainability. We took one per meeting and asked where our design fell short.

Reliability exposed the uncomfortable part. Our only database backup lived on one teammate's laptop. Security showed that we were all sharing a single admin login.

We now have scheduled backups, and everyone signs in with their own account and MFA. None of it was hard once we wrote the questions down.`,
    comments: [
      {
        author: 'paolo',
        createdAt: '2026-09-28T13:10:00.000Z',
        body: 'Taking one pillar per meeting is a smart way to keep it manageable. Which one surprised your group the most?',
      },
      {
        author: 'ana',
        createdAt: '2026-09-28T14:02:00.000Z',
        body: 'Sustainability. We had never thought about shutting down idle test environments as a design decision.',
      },
      {
        author: 'paolo',
        createdAt: '2026-09-29T00:45:00.000Z',
        body: 'Borrowing this format for our next sprint review.',
      },
    ],
  },
];

const RETIRED_DATES = new Set([
  '2026-09-03T10:45:00.000Z',
  '2026-09-15T03:05:00.000Z',
  '2026-09-21T08:00:00.000Z',
]);

// Previous text is used only to recognize untouched examples during an in-place upgrade.
export const PREVIOUS_SAMPLE_POSTS = ORIGINAL_SAMPLE_POSTS.filter((post) => !RETIRED_DATES.has(post.createdAt));
export const RETIRED_SAMPLE_POSTS = ORIGINAL_SAMPLE_POSTS.filter((post) => RETIRED_DATES.has(post.createdAt));

// Four fictional student learning journals, with two from each demo builder.
export const SAMPLE_POSTS = [
  {
    author: 'ana',
    createdAt: '2026-08-24T09:12:00.000Z',
    title: 'AWS Cloud finally made sense when I drew our app',
    description: `I started learning AWS by memorizing service names, and I kept mixing them up. This week I drew a small diagram of our class project instead: a web app, some uploaded files, and a database.

Putting EC2 beside the app, S3 beside the files, and RDS beside the database gave each service a purpose. I am still learning how those pieces connect, but the diagram made more sense than another list of acronyms.

I also studied Regions and Availability Zones. I had assumed a Region was just a setting to click before a lab. Now I understand why we need to think about where our resources run and how an app could keep working if one location has a problem.

The shared responsibility model was my biggest takeaway. AWS manages the cloud infrastructure, but I still need to think about our data, permissions, and configuration. Next time I study a service, I want to ask what it does and which responsibilities stay with me.`,
    comments: [
      {
        author: 'paolo',
        createdAt: '2026-08-24T13:40:00.000Z',
        body: 'Drawing a class project sounds much easier than memorizing everything. Did you put IAM on the diagram too?',
      },
      {
        author: 'ana',
        createdAt: '2026-08-24T15:05:00.000Z',
        body: 'Yes! I added it beside the permissions between the pieces. That is the part I want to practice next.',
      },
    ],
  },
  {
    author: 'paolo',
    createdAt: '2026-08-29T02:30:00.000Z',
    title: 'One small lab with EC2, S3, RDS, and IAM',
    description: `For today's guided AWS lab, I followed a simple web-app setup and wrote down why each service was there. EC2 ran the app, an S3 bucket held sample files, and RDS provided the relational database.

My first file request failed with AccessDenied. I checked the IAM role and the bucket policy instead of making the bucket public. Reading the permissions slowly helped me see that a running app does not automatically have access to everything in the account.

I also stopped thinking of RDS as a database that needs no attention. AWS handles tasks such as database backups and software maintenance, but I still have to choose sensible settings and control who can connect.

By the end of the lab, I could explain the four services without looking at my notes. I saved the diagram and followed the lab's cleanup steps. I want my next practice session to focus on permissions rather than adding more services at once.`,
    comments: [
      {
        author: 'ana',
        createdAt: '2026-08-29T06:18:00.000Z',
        body: 'The AccessDenied part is familiar. I am adding "check the role and policy" to my lab notes before I change any public-access settings.',
      },
    ],
  },
  {
    author: 'paolo',
    createdAt: '2026-09-09T07:20:00.000Z',
    title: 'My first Bedrock prompts were much too vague',
    description: `Our study group explored AWS AI services today. I compared services for tasks such as image analysis and text analysis with Amazon Bedrock, which gives access to foundation models for generative AI applications.

In a guided Bedrock exercise, I asked a model to "explain cloud computing." The answer was readable but much too broad for our beginner study notes. I tried again with an audience, a short word limit, and an example based on a college project. That version was easier to use.

I learned that a confident answer is not proof that the details are correct. I compared the service explanations with the AWS documentation and spotted a claim that needed checking. Prompting and reviewing the response are both part of the work.

My next goal is a small experiment using made-up study notes, not classmates' private information. I want to compare a few prompts and record what actually improves the answers before trying to build a full chatbot.`,
    comments: [
      {
        author: 'ana',
        createdAt: '2026-09-09T09:48:00.000Z',
        body: 'Giving it a specific audience helped me too. Did asking for an example change the explanation much?',
      },
      {
        author: 'paolo',
        createdAt: '2026-09-09T10:10:00.000Z',
        body: 'Yes, the class-project example was easier to follow. I still checked the service details against the docs.',
      },
    ],
  },
  {
    author: 'ana',
    createdAt: '2026-09-28T11:30:00.000Z',
    title: 'Studying for AI Practitioner, one scenario at a time',
    description: `I started preparing for the AWS Certified AI Practitioner exam, and my first practice questions showed a gap: I recognized the service names but struggled to explain why one option fit a problem better than another.

I went back to the official exam guide and made a study page for AI concepts, generative AI, foundation-model applications, responsible AI, and security. Instead of copying definitions, I wrote a small scenario beside each topic.

One evening I compared a classification task with a text-generation task. Another day I reviewed why permissions, sensitive data, and human review still matter when an application uses AI. Explaining those examples to a classmate helped me find the parts I had only memorized.

I have not taken the exam yet. For now, my progress is being able to explain a wrong answer and connect it to something I studied. Next week I plan to revisit the questions I missed and try a short AWS AI exercise alongside the reading.`,
    comments: [
      {
        author: 'paolo',
        createdAt: '2026-09-28T13:10:00.000Z',
        body: 'I recognize the names but get stuck on scenarios too. Are you keeping a list of the questions you missed?',
      },
      {
        author: 'ana',
        createdAt: '2026-09-28T14:02:00.000Z',
        body: 'Yes, with a short explanation of why my choice was wrong. It gives me a more useful review list than just the score.',
      },
      {
        author: 'paolo',
        createdAt: '2026-09-29T00:45:00.000Z',
        body: 'Borrowing that idea for our next study session. We can take turns explaining a scenario.',
      },
    ],
  },
];
