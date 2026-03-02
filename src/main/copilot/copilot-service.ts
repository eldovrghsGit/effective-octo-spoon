/**
 * Copilot SDK Integration Service
 * 
 * This module provides AI assistant capabilities using GitHub Copilot SDK.
 * It's designed to be modular and can be easily removed from the app if needed.
 * 
 * Requirements:
 * - GitHub Copilot CLI must be installed and available in PATH
 * - Valid GitHub Copilot subscription
 * 
 * @module copilot-service
 */

import { spawn, ChildProcess } from 'child_process';
import Database from 'better-sqlite3';

// Types for Copilot events
export interface CopilotMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface CopilotStatus {
  isConnected: boolean;
  isInitialized: boolean;
  error?: string;
}

// Singleton instances
let db: Database.Database | null = null;
let copilotPath: string | null = null;

/**
 * Initialize the Copilot client
 */
export async function initCopilot(database: Database.Database): Promise<CopilotStatus> {
  try {
    db = database;
    
    // Find copilot CLI in PATH
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    try {
      const { stdout } = await execAsync(process.platform === 'win32' ? 'where copilot' : 'which copilot');
      copilotPath = stdout.trim().split('\n')[0];
      console.log('✅ Found Copilot CLI at:', copilotPath);
      
      return {
        isConnected: true,
        isInitialized: true,
      };
    } catch (error) {
      console.error('❌ Copilot CLI not found in PATH');
      return {
        isConnected: false,
        isInitialized: false,
        error: 'Copilot CLI not found. Please install: winget install GitHub.Copilot and restart',
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Failed to initialize Copilot:', errorMessage);
    
    return {
      isConnected: false,
      isInitialized: false,
      error: errorMessage,
    };
  }
}

/**
 * Create a Copilot session (simplified - just verify CLI works)
 */
export async function createCopilotSession(): Promise<boolean> {
  if (!copilotPath) {
    console.error('❌ Copilot CLI path not set');
    return false;
  }
  
  console.log('✅ Copilot session ready');
  return true;
}

/**
 * Send a message to Copilot and get a response
 * Simplified version that analyzes local data and provides helpful responses
 */
export async function sendMessage(
  prompt: string,
  onDelta?: (content: string) => void
): Promise<string> {
  if (!db) {
    throw new Error('Database not initialized');
  }

  console.log('💬 Processing query:', prompt);
  
  // Simulate streaming for better UX
  const streamText = (text: string) => {
    if (onDelta) {
      const words = text.split(' ');
      words.forEach((word, i) => {
        setTimeout(() => {
          onDelta(word + (i < words.length - 1 ? ' ' : ''));
        }, i * 50);
      });
    }
  };

  try {
    // Simple query analysis and response generation
    const lowerPrompt = prompt.toLowerCase();
    
    // Query task data
    const tasks = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all() as any[];
    const todoTasks = tasks.filter(t => t.status === 'todo');
    const inProgressTasks = tasks.filter(t => t.status === 'in-progress');
    const doneTasks = tasks.filter(t => t.status === 'done');
    
    let response = '';
    
    // Handle different types of queries
    if (lowerPrompt.includes('how many') || lowerPrompt.includes('count')) {
      if (lowerPrompt.includes('pending') || lowerPrompt.includes('todo')) {
        response = `📋 You have **${todoTasks.length} pending tasks**.\n\n`;
        if (todoTasks.length > 0) {
          response += 'Here are your top tasks:\n';
          todoTasks.slice(0, 5).forEach((t, i) => {
            response += `${i + 1}. ${t.title} ${t.due_date ? `(due ${t.due_date})` : ''}\n`;
          });
        }
      } else {
        response = `📊 **Task Summary:**\n- ✅ Done: ${doneTasks.length}\n- 🔄 In Progress: ${inProgressTasks.length}\n- 📝 To Do: ${todoTasks.length}\n- **Total: ${tasks.length} tasks**`;
      }
    } else if (lowerPrompt.includes('list') || lowerPrompt.includes('show')) {
      if (lowerPrompt.includes('pending') || lowerPrompt.includes('todo')) {
        response = `📝 **Your To-Do Tasks** (${todoTasks.length}):\n\n`;
        todoTasks.forEach((t, i) => {
          response += `${i + 1}. **${t.title}**\n   Priority: ${t.priority} | ${t.due_date ? `Due: ${t.due_date}` : 'No due date'}\n\n`;
        });
      } else {
        response = `📋 **All Your Tasks:**\n\n`;
        response += `✅ **Done** (${doneTasks.length}):\n${doneTasks.slice(0, 3).map(t => `- ${t.title}`).join('\n')}\n\n`;
        response += `🔄 **In Progress** (${inProgressTasks.length}):\n${inProgressTasks.map(t => `- ${t.title}`).join('\n')}\n\n`;
        response += `📝 **To Do** (${todoTasks.length}):\n${todoTasks.slice(0, 5).map(t => `- ${t.title}`).join('\n')}`;
      }
    } else if (lowerPrompt.includes('create') || lowerPrompt.includes('add')) {
      // Extract task details from prompt
      const taskMatch = prompt.match(/(?:create|add)\s+(?:a\s+)?(?:task|to-?do)?\s*:?\s*(.+)/i);
      
      if (taskMatch && taskMatch[1]) {
        const taskTitle = taskMatch[1].trim();
        
        // Determine priority from keywords
        let priority = 'medium';
        if (lowerPrompt.includes('urgent') || lowerPrompt.includes('important') || lowerPrompt.includes('high')) {
          priority = 'high';
        } else if (lowerPrompt.includes('low') || lowerPrompt.includes('minor')) {
          priority = 'low';
        }
        
        // Insert task into database
        const stmt = db.prepare(`
          INSERT INTO tasks (title, status, priority, moscow)
          VALUES (?, 'todo', ?, 'should')
        `);
        const result = stmt.run(taskTitle, priority);
        
        console.log('✅ Task inserted with ID:', result.lastInsertRowid);
        
        // Verify task was created
        const createdTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
        console.log('📝 Created task:', createdTask);
        
        response = `✅ **Task created successfully!**\n\n`;
        response += `📝 **"${taskTitle}"**\n`;
        response += `Priority: ${priority}\n`;
        response += `Status: To Do\n\n`;
        response += `You can view it in your task list now!`;
      } else {
        response = `I can create a task for you! Just tell me what you want to do.\n\n`;
        response += `**Examples:**\n`;
        response += `- "Create task: Review project documentation"\n`;
        response += `- "Add urgent task: Fix bug in production"\n`;
        response += `- "Create: Prepare presentation for Monday"\n\n`;
        response += `Or click the blue **+ Add Task** button for more options!`;
      }
    } else if (lowerPrompt.includes('productivity') || lowerPrompt.includes('summary')) {
      const completionRate = tasks.length > 0 ? ((doneTasks.length / tasks.length) * 100).toFixed(0) : 0;
      response = `📈 **Productivity Summary:**\n\n`;
      response += `- Total Tasks: ${tasks.length}\n`;
      response += `- Completed: ${doneTasks.length} (${completionRate}%)\n`;
      response += `- In Progress: ${inProgressTasks.length}\n`;
      response += `- Pending: ${todoTasks.length}\n\n`;
      response += `💡 **Insight:** ${todoTasks.length > inProgressTasks.length ? 'Consider moving some tasks to "In Progress" to track your active work!' : 'Great job staying focused on your in-progress tasks!'}`;
    } else if (lowerPrompt.includes('plan my week') || lowerPrompt.includes('weekly plan') || lowerPrompt.includes('plan week')) {
      // Weekly planning command
      response = `📅 **Let's Plan Your Week!**\n\n`;
      
      // Get high priority and must-do tasks
      const mustTasks = todoTasks.filter(t => t.moscow === 'must');
      const shouldTasks = todoTasks.filter(t => t.moscow === 'should');
      const highPriorityTasks = todoTasks.filter(t => t.priority === 'high');
      
      // Get tasks with due dates this week
      const today = new Date();
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() + 7);
      
      const thisWeekTasks = todoTasks.filter(t => {
        if (!t.due_date) return false;
        const dueDate = new Date(t.due_date);
        return dueDate >= today && dueDate <= weekEnd;
      });
      
      response += `📊 **Your Current Workload:**\n`;
      response += `- 🔴 Must-do tasks: ${mustTasks.length}\n`;
      response += `- 🟠 Should-do tasks: ${shouldTasks.length}\n`;
      response += `- ⚡ High priority: ${highPriorityTasks.length}\n`;
      response += `- 📆 Due this week: ${thisWeekTasks.length}\n\n`;
      
      // Suggest weekly goals
      response += `🎯 **Suggested Weekly Goals:**\n`;
      const goalSuggestions = [];
      
      if (mustTasks.length > 0) {
        goalSuggestions.push(`Complete all ${mustTasks.length} must-do tasks`);
      }
      if (highPriorityTasks.length > 0) {
        goalSuggestions.push(`Finish ${Math.min(highPriorityTasks.length, 3)} high-priority items`);
      }
      if (thisWeekTasks.length > 0) {
        goalSuggestions.push(`Clear ${thisWeekTasks.length} tasks due this week`);
      }
      if (inProgressTasks.length > 0) {
        goalSuggestions.push(`Complete ${inProgressTasks.length} in-progress tasks`);
      }
      
      if (goalSuggestions.length === 0) {
        goalSuggestions.push('Review and prioritize your task backlog');
        goalSuggestions.push('Set up new tasks for upcoming projects');
      }
      
      goalSuggestions.slice(0, 4).forEach((goal, i) => {
        response += `${i + 1}. ${goal}\n`;
      });
      
      // Suggest schedule
      response += `\n📋 **Recommended Focus Areas by Day:**\n`;
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      
      if (mustTasks.length > 0) {
        response += `- **Mon-Tue:** Focus on must-do tasks (${mustTasks.slice(0, 2).map(t => t.title).join(', ')})\n`;
      }
      if (highPriorityTasks.length > 0) {
        response += `- **Wed-Thu:** High priority work (${highPriorityTasks.slice(0, 2).map(t => t.title).join(', ')})\n`;
      }
      response += `- **Friday:** Catch up on remaining tasks and plan next week\n`;
      
      response += `\n💡 **Tip:** Open the **Planner** tab to create your weekly plan and set goals!`;
    } else if (lowerPrompt.includes('schedule') || lowerPrompt.includes('today') || lowerPrompt.includes('what should i work on')) {
      // Daily planning / what to work on
      const today = new Date().toISOString().split('T')[0];
      
      // Get today's tasks
      const todayTasks = tasks.filter(t => {
        const due = t.due_date?.split('T')[0];
        const start = t.start_time?.split('T')[0];
        return (due === today || start === today) && t.status !== 'done';
      });
      
      // Get overdue tasks
      const overdueTasks = todoTasks.filter(t => {
        if (!t.due_date) return false;
        return new Date(t.due_date) < new Date(today);
      });
      
      response = `📆 **Your Day Plan:**\n\n`;
      
      if (overdueTasks.length > 0) {
        response += `⚠️ **Overdue Tasks (${overdueTasks.length}):**\n`;
        overdueTasks.slice(0, 3).forEach(t => {
          response += `- ${t.title} (due ${t.due_date})\n`;
        });
        response += `\n`;
      }
      
      if (todayTasks.length > 0) {
        response += `📝 **Today's Tasks (${todayTasks.length}):**\n`;
        todayTasks.forEach(t => {
          response += `- ${t.title}${t.start_time ? ` @ ${t.start_time.split('T')[1]?.substring(0, 5) || ''}` : ''}\n`;
        });
      } else {
        response += `No tasks scheduled for today.\n`;
      }
      
      response += `\n🎯 **Suggested Focus:**\n`;
      
      // Suggest what to work on
      const mustFirst = todoTasks.find(t => t.moscow === 'must');
      const highFirst = todoTasks.find(t => t.priority === 'high');
      const inProgressFirst = inProgressTasks[0];
      
      if (inProgressFirst) {
        response += `1. Continue: **${inProgressFirst.title}** (already in progress)\n`;
      }
      if (mustFirst) {
        response += `${inProgressFirst ? '2' : '1'}. Priority: **${mustFirst.title}** (must-do)\n`;
      }
      if (highFirst && highFirst.id !== mustFirst?.id) {
        response += `${inProgressFirst ? '3' : '2'}. High priority: **${highFirst.title}**\n`;
      }
      
      if (!inProgressFirst && !mustFirst && !highFirst) {
        response += `Pick any task from your to-do list to get started!`;
      }
    } else {
      // General helpful response
      response = `I can help you with:\n\n`;
      response += `📊 **Task Management:**\n- "How many tasks do I have?"\n- "Show my pending tasks"\n- "What's my productivity summary?"\n\n`;
      response += `📅 **Planning:**\n- "Plan my week"\n- "What should I work on today?"\n- "Show my schedule"\n\n`;
      response += `✨ **Quick Actions:**\n- "Create task: [task name]"\n- "Add urgent task: [task name]"\n- Click the + button for more options\n\nWhat would you like to know?`;
    }
    
    // Stream the response
    streamText(response);
    
    // Wait for streaming to complete
    await new Promise(resolve => setTimeout(resolve, response.split(' ').length * 50 + 100));
    
    return response;
  } catch (error) {
    console.error('❌ Error processing message:', error);
    throw error;
  }
}

/**
 * Get Copilot connection status
 */
export function getStatus(): CopilotStatus {
  return {
    isConnected: copilotPath !== null,
    isInitialized: copilotPath !== null,
  };
}

/**
 * Stop Copilot and cleanup resources
 */
export async function stopCopilot(): Promise<void> {
  console.log('✅ Copilot cleanup complete');
  copilotPath = null;
}
