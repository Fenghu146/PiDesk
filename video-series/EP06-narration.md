前五集我们讲了 PiDeck 是什么、怎么安装、怎么配模型、怎么对话。但如果你只用 PiDeck 来对话，那你只用到了它三成的能力。这集我们一次性讲完剩下的精华功能。

先回到最基础的多项目管理。PiDeck 左侧的项目列表支持拖动排序。你可以把最常用的项目拖到最上面。右键点击项目，可以看到更多操作：添加文件、打开终端、查看历史会话、导入外部会话、删除项目。每个项目完全隔离。项目 A 的 Git 分支不会影响项目 B。项目 A 的会话历史项目 B 看不到。如果你同时开发三五个项目，这种隔离会省很多心。

Git 集成是 PiDeck 最实用的功能之一。每个项目顶部会显示当前 Git 分支。点击 Git 状态，会展开一个完整的 Git 面板。这里展示了当前分支的变更文件列表。你可以看到每个文件的改动统计：新增了多少行、删除了多少行。点击任意文件，可以看到 diff 视图，展示具体的代码变更。甚至可以直接在面板里填写提交信息，点击提交，完成一次 Git 提交。面板顶部还有分支选择器，你可以快速切换分支或者创建新分支。

会话历史是很多开发者最需要的功能。把鼠标悬停在项目上，右键点击 "历史会话"。这里列出了这个项目的所有历史对话，按时间倒序排列。点击任意一条，就能恢复当时的上下文。你可以接着聊，也可以复制当时的方案。如果你想把对话导出，右键会话可以选择"导出 HTML"，生成一份完整的对话记录。

每个 Agent 绑定一个独立的终端 Tab。点击项目顶部的终端按钮，底部就会展开终端面板。这个终端绑定的是当前项目的目录。你在对话里执行的 ! 命令，和这里执行的命令，是在同一个目录下的。终端支持多 Tab、主题切换、拖拽调整高度。你可以在终端里执行任何 Shell 命令，然后回到对话区让 AI 分析命令输出。

PiDeck 内置了两个 Prompt 商店。一个是国际商店 prompts.chat，一个是中文精选库 XuePrompt。中文精选库有 4000 多中文提示词，按分类整理，支持搜索。你可以搜索"代码审查"、"重构"、"写测试"等关键词，找到合适的提示词。找到后，一键导入到本地模板，下次对话直接调用。

还有两个锦上添花的功能。草稿本是一个浮层式的笔记区域。你可以在里面随手记点什么，勾选映射到对话，或者只是临时存放一些思路。内置浏览器在右侧抽屉里。你可以边和 AI 对话，边打开网页查资料。浏览器支持多标签、地址栏、甚至手机和平板的视口预设。如果你想预览 HTML 文件，也可以直接走内置浏览器打开。

最后说一下设置。PiDeck 的设置面板分为几个部分：基础设置、代理设置、开发设置。基础设置里可以调整字号、主题、启动行为等。代理设置里可以配置桌面端代理和 pi Agent 代理。开发设置里可以开启一些实验性功能。设置修改后，有些需要重启 Agent 才能生效。

六集讲完，我们来做一个最终的对比。裸 pi CLI 的能力，PiDeck 全部保留。PiDeck 加的是图形化、多项目管理、会话可视化、Git 集成、文件引用、Prompt 商店、浏览器、草稿本。你不需要在图形界面和命令行之间做选择。PiDeck 让你享受图形的便利，同时保留 pi 的全部能力。

六集回顾一下。EP01 我们搞清楚了 PiDeck 是什么。EP02 我们安装了 PiDeck。EP03 我们理解了 pi 连接。EP04 我们配置了模型。EP05 我们学会了高效对话。EP06 我们过了一遍进阶功能。到这里，PiDeck 的核心用法你已经全部掌握了。

这个系列到这里就全部结束了。PiDeck 是一个免费开源的项目，如果你觉得有用，欢迎去 GitHub 点个 Star。也欢迎加入我们的 QQ 交流群，一起交流使用心得。我是曹阿宇，感谢收看。如果这个系列对你有帮助，别忘了点赞、投币、收藏。我们下个系列见。



Last five episodes covered what PiDeck is, how to install it, how to configure models, and how to have conversations. But if you only use PiDeck for chatting, you are using only thirty percent of its capabilities. In this episode we cover all the remaining highlights in one go.

Let us return to multi-project management. PiDeck's left sidebar supports drag-and-drop sorting. You can drag your most-used projects to the top. Right-click a project and you will see more options: add files, open terminal, view session history, import external sessions, delete project. Each project is fully isolated. Project A's Git branch does not affect Project B. Project A's session history is not visible to Project B. If you are developing three or five projects simultaneously, this isolation will save you a lot of trouble.

Git integration is one of PiDeck's most practical features. Each project shows its current Git branch at the top. Click the Git status and a full Git panel expands. It shows the changed file list of the current branch. You can see the change statistics for each file: how many lines added, how many lines deleted. Click any file and you can see the diff view showing the specific code changes. You can even fill in a commit message directly in the panel and click commit to complete a Git commit. At the top of the panel there is also a branch selector for quickly switching branches or creating new ones.

Session history is one of the most needed features for many developers. Hover over a project, right-click, and select Session History. Here you will see all historical conversations of this project, sorted in reverse chronological order. Click any entry to restore that context. You can continue the conversation or copy the previous solution. If you want to export a conversation, right-click the session and select Export HTML to generate a complete conversation record.

Each Agent has an independent terminal tab. Click the terminal button at the top of the project, and a terminal panel expands at the bottom. This terminal is bound to the current project directory. The ! commands you execute in the chat and the commands you run here are in the same directory. The terminal supports multiple tabs, theme switching, and draggable height adjustment. You can execute any Shell command in the terminal, then go back to the chat area and let the AI analyze the command output.

PiDeck has two built-in Prompt Stores. One is the international store prompts.chat, and the other is the Chinese curated library XuePrompt. The Chinese curated library has over 4,000 Chinese prompts, organized by category, with search support. You can search for keywords such as "code review", "refactoring", "write tests" to find suitable prompts. After finding one, import it to local templates with one click, and call it directly in the next conversation.

There are two more bonus features. ScratchPad is a floating note area. You can jot down ideas, check and map them to conversations, or just temporarily store thoughts. The built-in browser is in the right drawer. You can browse the web for information while chatting with AI. The browser supports multiple tabs, an address bar, and even mobile and tablet viewport presets. If you want to preview an HTML file, you can also open it directly in the built-in browser.

Finally, settings. PiDeck's settings panel is divided into several parts: basic settings, proxy settings, and development settings. In basic settings you can adjust font size, theme, and startup behavior. In proxy settings you can configure the desktop proxy and the pi Agent proxy. In development settings you can enable experimental features. After changing settings, some changes require restarting the Agent to take effect.

After six episodes, let us do a final comparison. Everything the raw pi CLI can do, PiDeck retains. PiDeck adds GUI, multi-project management, visual session history, Git integration, file references, Prompt Store, browser, and ScratchPad. You do not need to choose between GUI and command line. PiDeck lets you enjoy the convenience of graphics while keeping pi's full capabilities.

A quick recap of the six episodes. EP01 we clarified what PiDeck is. EP02 we installed PiDeck. EP03 we understood pi connections. EP04 we configured models. EP05 we learned efficient conversations. EP06 we went through advanced features. At this point, you have mastered the core usage of PiDeck.

That concludes this series. PiDeck is a free, open source project. If you find it useful, feel free to give it a star on GitHub. You are also welcome to join our QQ group to share usage tips. This is Cao A Yu, thanks for watching. If this series was helpful, do not forget to like, coin, and favorite. See you in the next series.
