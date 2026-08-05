上集我们了解了 PiDeck 是什么，这集直接上手。

在开始之前，你需要先装好两样东西。
第一是 Node.js 20 或更高版本。打开终端，输入 node --version 确认一下。
第二是 pi CLI。用 npm install -g pi 全局安装。装完之后输入 pi --version，看到版本号就说明 OK。如果你的终端里已经能打出 pi 的版本号，直接跳到下一段。

接下来去 PiDeck 的 GitHub Releases 页面，下载对应你系统的安装包。Windows 下载 exe，Mac 下载 dmg，Linux 下载 AppImage。下载完成后，双击安装包，跟着提示走就行。安装完之后，打开 PiDeck，你就看到主界面了。

现在我们来添加第一个项目。点击左侧的加号按钮，选择你电脑上一个真实的项目目录。选完之后，PiDeck 会自动启动这个项目的 pi Agent。等几秒钟，当状态变成绿色，说明 Agent 已经就绪。左侧的项目列表里会出现你刚添加的项目，后面跟着一个绿色的状态点。

接下来，我们试试第一次对话。点击你刚添加的项目，在输入框里输入一行简单的指令，比如 "请介绍一下这个项目的结构"。你会看到 AI 开始流式输出回答。在等待回答的时候，你可以看一下右侧的文件树。这里列出了你项目中的所有文件。如果你在对话中需要引用某个文件，直接输入 @ 就能弹出文件建议。

对话结束后，PiDeck 会自动保存这次会话。如果你想回看之前的对话，把鼠标悬停在项目上，右键点击 "历史会话"。这里会列出这个项目的所有历史对话。点击任意一条，就能恢复当时的上下文。这意味着你不需要在终端里翻来翻去找历史记录。

到这里，你可以停下来检查一下，确保以下四件事都正常。
第一，项目列表里有你刚添加的项目。
第二，状态点是绿色的，说明 Agent 在运行。
第三，你已经在对话区发了一条消息，并且得到了 AI 的回复。
第四，右侧文件树能正常展开。
如果这四件事都 OK，恭喜你，PiDeck 已经跑通了。

这一集到这里。下集我们讲如何配置 pi 连接、模型设置，以及理解 Agent Tab 背后的工作原理。如果这个视频对你有帮助，点个赞、投个币，这是对我最大的支持。有问题评论区见。我是曹阿宇，我们下集见。



Last episode we covered what PiDeck is. This time we get hands-on.

Before we begin, you need two things ready.
First, Node.js 20 or higher. Open your terminal and type node --version to confirm.
Second, the pi CLI. Install it globally with npm install -g pi. After that, type pi --version. If you see a version number, you're good. If your terminal already shows pi's version, skip ahead.

Next, go to the PiDeck GitHub Releases page and download the installer for your system. Windows users grab the exe, Mac users grab the dmg, and Linux users grab the AppImage. Once downloaded, double-click the installer and follow the prompts. After installation, open PiDeck and you will see the main interface.

Now let's add your first project. Click the plus button on the left and choose a real project folder on your computer. After selecting it, PiDeck will automatically launch the pi Agent for that project. Wait a few seconds until the status dot turns green, which means the Agent is ready. You will see your newly added project in the list on the left, marked with a green status indicator.

Next, let's try our first conversation. Click the project you just added, type a simple instruction in the input box like "introduce the structure of this project". You will see the AI start streaming its answer. While waiting, take a look at the file tree on the right. It lists all files in your project. If you need to reference a specific file during the conversation, type @ and a file suggestion panel will pop up.

After the conversation ends, PiDeck automatically saves the session. If you want to review previous conversations, hover over the project, right-click, and select Session History. You will see all past conversations for this project. Click any entry to restore that context. This means you never have to hunt through terminal history again.

At this point, pause and verify these four things.
First, your newly added project appears in the list.
Second, the status dot is green, meaning the Agent is running.
Third, you have sent a message in the chat area and received an AI response.
Fourth, the file tree on the right opens normally.
If all four check out, congratulations, PiDeck is up and running.

That is it for this episode. Next time, we cover pi connection setup, model configuration, and how Agent Tabs work under the hood. If this video helped, give it a like and a coin. Questions go in the comments. This is Cao A Yu. See you next episode.
