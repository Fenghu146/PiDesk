模型配好了，API Key 也填好了。但这只是开始。怎么高效地和 AI 对话，让它真正帮你写代码？这集我们实战演示。

很多人的第一次对话是这样的：输入 "你好"，AI 回复 "你好，有什么可以帮你的？"，然后就没有然后了。这不是 AI 笨，是 prompt 太宽泛了。有效的对话从具体的问题开始。比如直接说："帮我看看 src/App.tsx 有什么问题" 或者 "帮我实现一个深色模式切换功能"。越具体，AI 的回答越有价值。

PiDeck 有一个非常实用的功能：文件引用。在输入框里输入 @，就会弹出你项目中的文件列表。选择某个文件后，这个文件的内容会自动加入到上下文里。这意味着 AI 在看回答的时候，已经看过这个文件了。你不需要手动复制粘贴文件内容，也不需要告诉 AI 文件路径。@ 一下就行。看 AI 的回复，它会直接引用你 @ 的文件内容。这就是上下文的作用。

上下文是 AI 对话的核心概念。你可以把它理解为 AI 的短期记忆。PiDeck 顶部会显示当前的上下文使用情况。包括 token 数量、缓存状态等。当上下文快满的时候，AI 可能会忘记你之前聊过什么。这时候有两个选择：一是开启一个新的会话，二是使用 /compact 命令压缩上下文。

PiDeck 内置了一些斜线命令，能帮你更高效地管理对话。输入 / 就能看到所有可用的斜线命令。常用的有这几个：/compact 压缩上下文，把长对话总结成短摘要，腾出 token 空间。/session 查看或管理当前会话。还有更多命令，你可以自己探索。

PiDeck 还支持在输入框里直接执行 Shell 命令。在输入框里输入 ! 加上命令，比如 !ls -la 或者 !git status。命令会直接在你的项目目录里执行，输出结果会显示在对话区。这意味着你不需要切换到终端，就能快速查看项目状态。注意，! 命令执行的是当前项目的目录，不是全局目录。

PiDeck 的对话区支持 Markdown 渲染和流式输出。你会看到 AI 的回答一个字一个字地打出来，像打字机一样。在回答下方，有一个活动轨迹区域，展示了 AI 这轮做了什么：读了哪些文件、执行了哪些命令、修改了哪些代码。你可以点击展开，看到更详细的执行过程。

PiDeck 支持编辑和删除消息。把鼠标悬停在任何一条消息上，就会看到编辑和删除按钮。点击编辑，消息内容会回填到输入框，你可以修改后重新发送。点击删除，这条消息会被移除。这个功能在 prompt 写错或者想调整需求的时候非常有用。

最后我给你演示一个完整的开发工作流。第一步，@ 一个你想修改的文件。第二步，提出具体需求，比如 "帮我把这个函数改成异步的"。第三步，AI 生成代码后，输入 !git diff 查看修改了哪些文件。第四步，如果满意，用 /session 开一个全新会话，开始下一个任务。这就是 PiDeck 的基本开发工作流。

这一集到这里。对话你已经会了。下集我们讲 PiDeck 相比裸 pi CLI 的进阶功能：多项目管理、Git 集成、Prompt 商店。如果这个视频对你有帮助，点个赞、投个币。有问题评论区见。我是曹阿宇，我们下集见。



Models are configured and API Keys are filled in. But this is just the beginning. How do you have efficient conversations with AI and make it actually help you write code? In this episode we demonstrate real workflows.

Many people's first conversation goes like this: they type "hello", AI replies "hello, how can I help you?", and then nothing happens. This is not because AI is dumb. It is because the prompt is too broad. Effective conversations start with specific questions. For example, directly say "help me find issues in src/App.tsx" or "implement a dark mode toggle feature". The more specific you are, the more valuable the AI's answer becomes.

PiDeck has a very useful feature called file references. Type @ in the input box and a list of files in your project will pop up. After selecting a file, its contents are automatically added to the context. This means the AI has already read the file before answering. You do not need to manually copy and paste file contents, and you do not need to tell the AI the file path. Just type @. Look at the AI's reply, and it will directly reference the content of the file you @. That is the power of context.

Context is the core concept of AI conversations. You can think of it as the AI's short-term memory. The top of PiDeck displays the current context usage, including token count and cache status. When the context is about to fill up, the AI may forget what you discussed earlier. At that point, you have two choices: start a new session, or use the /compact command to compress the context.

PiDeck has built-in slash commands that help you manage conversations more efficiently. Type / to see all available slash commands. The common ones are: /compact, which compresses the context by summarizing long conversations into short summaries, freeing up token space. /session, which views or manages the current session. There are more commands for you to explore.

PiDeck also supports executing Shell commands directly in the input box. Type ! followed by a command in the input box, such as !ls -la or !git status. The command executes directly in your project directory, and the output is displayed in the chat area. This means you do not need to switch to the terminal to quickly check project status. Note that ! commands execute in the current project directory, not globally.

PiDeck's chat area supports Markdown rendering and streaming output. You will see the AI's answer appear character by character, like a typewriter. Below the answer, there is an activity trail that shows what the AI did this round: which files were read, which commands were executed, and which code was modified. You can click to expand and see more detailed execution steps.

PiDeck supports editing and deleting messages. Hover over any message and you will see edit and delete buttons. Click edit and the message content is filled back into the input box for you to modify and resend. Click delete and the message is removed. This feature is very useful when the prompt is wrong or you want to adjust your request.

Finally, let me demonstrate a complete development workflow. Step one, @ a file you want to modify. Step two, make a specific request, such as "help me make this function async". Step three, after the AI generates code, type !git diff to see which files were changed. Step four, if satisfied, use /session to start a brand new session and begin the next task. This is the basic development workflow of PiDeck.

That is it for this episode. You now know how to have conversations. Next episode we cover the advanced features of PiDeck compared to the raw pi CLI: multi-project management, Git integration, and the Prompt Store. If this video helped, give it a like and a coin. Questions go in the comments. This is Cao A Yu. See you next episode.
