---
title: "How I built my interactive portfolio with an AI chat"
description: "The stack, the decisions and the logic behind a portfolio that keeps itself up to date, with a chat assistant that answers as I would."
date: "2026-06-20"
tags: ["react", "typescript", "ai", "cloudflare", "storytelling"]
projectId: "dev1"
---

A while back I started thinking about how to show what I can do without falling into the usual: a PDF, a LinkedIn page, and not much else. What bothered me most is that those formats show **results**, but not **how you think**. And I wanted anyone who landed on my site to feel, in less than a minute, how I actually work.

So I decided on something that's simple in concept and complicated in practice: build a portfolio that was, in itself, a demonstration of my skills. Not just saying "I use React"; using it. Not just saying "I work with AI"; having a real AI chat answering in my voice.

Let me walk you through how I put it all together, step by step, trying to make sense of it even if you don't know much about programming.

## The backbone: the stack

When someone says "stack" in programming, they mean the set of technologies that hold a project up. It's like cooking a recipe: every ingredient has a role. Mine looks like this:

- **React + TypeScript**: the engine of the site. React lets me build interactive interfaces (the projects that open, the animations, dark mode). TypeScript is like adding rules to JavaScript so it warns me before I make a mistake.
- **Vite**: the "assembler". It takes all my code files and packages them into something the browser understands.
- **Tailwind CSS**: a way of writing styles without needing separate files. Instead of saying "this class has a blue background and rounded border" in a CSS file, I write it straight into the HTML.
- **GitHub Pages**: where the site lives. It's free for public repos and fast.
- **Cloudflare Workers**: a small server that runs in hundreds of cities around the world, including Bogotá. I only use it for the chat, because GitHub Pages can't run code on the server side.
- **Groq**: the AI model provider. It's like having access to a chatbot brain, but fast and cheap.

It sounds like a lot, but every piece solves a specific problem.

## What happens when you land on the site

Imagine my portfolio is a house. When someone rings the bell (enters the site), GitHub Pages immediately hands over all the static files: the HTML, the CSS, the images, the JavaScript code. All of that gets downloaded to the visitor's browser and assembled right there. That makes it very fast.

The important thing is: **there's nobody on the other side**. There's no server of mine waiting for you. Just files that already live in the cloud and get delivered.

So far so good. But what happens when the visitor opens the chat and types a question?

## The chat: why I needed a small server

The chat can't be static. It has to talk to an AI model, and for that it needs a secret key (like a password proving I have access to the service). That key **can't be in the site's code**, because anyone could inspect it and steal it.

So I built a middleman: a "worker" on Cloudflare. When the visitor types a message, the flow is:

1. The browser sends the message to the worker.
2. The worker has the secret key stored (where no one can see it) and uses it to call the AI model.
3. The model replies.
4. The worker forwards the response back to the browser.

It's like a waiter at a restaurant. You order at the table and the waiter handles talking to the kitchen. You never enter the kitchen and you never see the secret recipe.

## The hard part: making the chat sound like me

This is where I spent the most time. Getting an AI model to answer questions isn't hard. What's hard is making it answer **like you**, not like an external assistant talking about you in third person.

The difference is huge. If someone asks "what projects do you have?", the answer should sound like "I built a local lakehouse with Spark and dbt...", not "Luisana has worked on various data projects". Sounds obvious, but models by default lean toward the second option.

The solution was giving the model a personality manual before every response. I explain how it should sound, what expressions to avoid, what to do if it's asked something outside my portfolio. It's similar to training someone who's going to answer the phone on my behalf: I don't give them a rigid script, I give them a tone and clear rules.

Also, on every interaction I inject a fresh summary of all my projects. When someone asks about a specific one, the model answers with real details instead of making things up. And if it's asked something with no context (the weather, politics, opinions), the manual tells it to politely decline and redirect to the portfolio.

To protect against bots, the worker counts how many messages each visitor sent in the last minute. If they go over ten, it asks them to wait. It's a simple but effective system, and it stores the counter in a tiny database that Cloudflare provides for free.

## A CV that keeps itself updated

I hate updating CVs. Every time I learned something new or finished a project, I had to edit my PDF, find the Word file, make it look nice again. It was a chore I avoided.

So I turned my CV into data. I have a `.json` file (a structured text format) with all my information: name, education, work, skills, languages. I write it once in Spanish and English.

Then, two things read that file:

1. **A script with LaTeX** (a language designed for typesetting elegant documents). It takes the data and generates two PDFs: one in Spanish and one in English. When I make any change to the JSON, the script runs automatically and the PDFs stay updated.

2. **A page inside the site** (`/cv`). It reads the same JSON and shows it as pretty HTML. If you want the PDF, there's a button to download it.

The projects on the CV are filtered automatically. Only the ones that are finished or published show up. The ones I'm still working on don't. When a project changes status, the CV regenerates itself without me touching anything.

The result is that now I update my CV without thinking. I change a word, push the commit, and in two minutes the site and the PDF are fresh.

## Decisions that gave me pause

Two decisions cost me significant thought.

The first was **where to put the blog**. I could publish on Dev.to, a platform for people who code, and have an instant audience. But I'd end up depending on someone else's URL, and if Dev.to changes something, I'm affected. In the end I decided to build the blog inside my portfolio: each post is a text file in my repository, written in a simple format called Markdown. When I make a change, the whole site rebuilds with the new post. Later, when I have several posts, I can cross-post to Dev.to pointing back to my site as the original source.

The second was **which AI model to use**. There are better-known options (OpenAI, Anthropic), but they're more expensive. Groq runs open models (Llama, made by Meta) at very fast speeds and for cents a month. For a portfolio chat, where speed matters more than having the most sophisticated model in the world, the choice was easy.

## What I'm taking from all of this

Three things surprised me while building this site.

First: **working with AI in production isn't magic**. Most of the time I spent on the chat wasn't coding, it was tweaking the personality manual. I'd try a version, read the responses, adjust the tone, try again. It feels more like editing a text than writing code.

Second: **automating small tasks has big effects**. Once I made the CV regenerate itself, I stopped procrastinating to update it. The friction vanished and I started touching it often. The same happened with the project documentation.

Third: **a portfolio is a project of its own**. I had thought of it as a place to display what I do. But along the way I ended up building several tools that are now living examples of how I work. The portfolio turned into one of my best projects.

## The code

It's open at [github.com/LuisanaRuggia/portfolio](https://github.com/LuisanaRuggia/portfolio). If you want to copy it as a base for something of your own, the interesting parts are `backend/scripts` (the small programs that keep the portfolio up to date) and `backend/workers/chat` (the chat code). If you find something that could be done better, drop me a line: I love learning from people who look at things from a different angle.
