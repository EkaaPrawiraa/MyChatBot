# MyChatBot

Axis Assistant is a multi-service AI agent platform built with Go and Python that performs autonomous multi-step task execution with persistent memory, tool orchestration, and real-world API integrations.

Features:

Single User


    Gmail integration
    Google Calendar integration
    Persistent memory (pgvector)
    Multi-step tool execution
    Dashboard with activity logs
    Human approval before action
    Async reminder worker
    AI Planning Visualization
    Show graph execution from LangGraph in UI.
    Cross-Tool Workflow Automation
    Smart Email Mode (notify if job email)
    AI Safety & Guardrails
    Speech to Text

Memory:
    Shortterm memory
    Longterm Memory

Reminder Engine (Sends notification via WhatsApp/email)

Vue dashboard with:
    Chat interface
    Activity log timeline
    Executed tool trace
    Memory viewer
    Upcoming tasks

Daily Briefing Mode
    Every morning:
        “Good morning X. Today you have 2 meetings, 3 pending tasks, and one email requiring response.”


User Profile Modeling (Structured + Semantic)
Not just vector memory — but structured profile:
Preferred meeting hours
Frequently contacted people
Work habits
Focus hours
Project contexts
Communication style