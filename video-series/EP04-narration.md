上集我们搞定了 pi 连接。但如果你现在去对话区发消息，很可能会报错。为什么？因为你还没有配置模型。这集我们就来解决这个问题。

PiDeck 的配置管理入口在顶部。点击设置按钮，你会看到几个标签页：Models、Auth、Settings、Skills、Prompts、Extensions。这集我们只看 Models 和 Auth。Models 标签页负责管理你使用的所有 AI 模型。Auth 标签页负责管理 API Key 和认证信息。简单说，Models 决定你用谁的大脑，Auth 决定你有没有入场券。

在 PiDeck 里，模型配置分为两层：Provider 和 Model。Provider 是模型提供商，比如 OpenAI、Anthropic、本地 Ollama、或者任何兼容 OpenAI API 的服务。Model 是具体的模型名称，比如 GPT-4o、Claude Sonnet 4、或者 Llama 3。你先添加一个 Provider，告诉 PiDeck 你的 API Key 和 API 地址。然后在 Model 层，你从已添加的 Provider 里选择具体用哪个模型。

我们来实际操作一下。点击 Provider 区域的添加按钮。先选 Provider 类型。如果你用 OpenAI，就选 OpenAI。如果你用 Claude，就选 Anthropic。如果你用本地模型，就选 Ollama 或者自定义 OpenAI 兼容。填完之后，点击保存。PiDeck 会自动验证这个 Provider 是否可用。保存后，PiDeck 会尝试连接一下。如果显示成功，说明这个 Provider 已经加好了。如果失败，检查一下 API Key 有没有填错，或者 API 地址是不是正确的。

Provider 加好之后，我们来加模型。点击 Model 区域的添加按钮，从下拉列表选择你刚才添加的 Provider，然后输入模型名称。模型名称必须和 Provider 那边一致。比如 OpenAI 的 GPT-4o，你就填 gpt-4o。Claude 的 Sonnet，你就填 claude-sonnet-4-20250514。加完之后，在对话区顶部就可以切换模型了。

API Key 在哪里管理呢？在 Auth 标签页。这里列出了你所有 Provider 对应的 API Key。你可以在这里添加、编辑、删除 API Key。PiDeck 会把 API Key 加密存储在本地，不会上传到任何服务器。

最后给你一个模型选择建议。如果你主要是写代码，GPT-4o 和 Claude Sonnet 4 都是很好的选择。GPT-4o 在代码理解和生成上很强，Claude Sonnet 4 在长上下文和 reasoning 上更突出。如果你需要本地模型，Ollama 跑 Llama 3 或 Mistral 也够用，但需要较好的显卡。我的建议是：先用云模型跑通流程，后面再根据需求换模型。

配置完之后，怎么验证模型是否可用呢？回到对话区，在顶部选择你刚添加的模型，随便发一条消息。如果 AI 正常回复，说明模型配置成功。如果报错，先看错误信息。常见的错误是 API Key 无效、模型名称错误、或者 Provider 地址填错了。

这里有两个常见的坑，帮你避一下。第一，模型名称要完全一致，包括大小写和版本号。比如 gpt-4o 和 gpt-4o-mini 是不同的模型。第二，如果你用第三方 API 中转，Provider 类型选"自定义 OpenAI 兼容"，然后把中转地址填进去。第三，改完配置后，如果对话区没有变化，尝试重启一下 Agent。在项目上右键，选择重启。

好，总结一下。模型配置分两层：Provider 和 Model。Provider 决定 API Key 和地址，Model 决定具体用哪个大脑。配置完成后，在对话区顶部切换模型。如果遇到问题，先检查模型名称和 API Key。

这一集到这里。模型和 API Key 都配好了，下集我们正式开始对话——让 AI 帮你写代码、改代码、解释代码。如果这个视频对你有帮助，点个赞、投个币。有问题评论区见。我是曹阿宇，我们下集见。



Last episode we sorted out the pi connection. But if you try sending a message in the chat area now, you will likely get an error. Why? Because you have not configured a model yet. That is what we are fixing in this episode.

The configuration entry point is at the top of PiDeck. Click the settings button and you will see several tabs: Models, Auth, Settings, Skills, Prompts, and Extensions. This episode we focus on Models and Auth. The Models tab manages all the AI models you use. The Auth tab manages API Keys and authentication. Simply put, Models decides whose brain you use, and Auth decides whether you have a ticket to get in.

In PiDeck, model configuration has two layers: Provider and Model. The Provider is the model vendor, such as OpenAI, Anthropic, local Ollama, or any OpenAI-compatible service. The Model is the specific model name, such as GPT-4o, Claude Sonnet 4, or Llama 3. You first add a Provider to tell PiDeck your API Key and API endpoint. Then, at the Model layer, you choose which specific model to use from the added Providers.

Let us do this together. Click the add button in the Provider area. First, select the Provider type. If you use OpenAI, pick OpenAI. If you use Claude, pick Anthropic. If you use a local model, pick Ollama or Custom OpenAI Compatible. After filling in the details, click Save. PiDeck will automatically verify whether this Provider is reachable. If it shows success, the Provider is ready. If it fails, double-check your API Key and API endpoint.

Once the Provider is ready, let us add a model. Click the add button in the Model area, select the Provider you just added from the dropdown, and enter the model name. The model name must match exactly what the Provider expects. For OpenAI's GPT-4o, enter gpt-4o. For Claude's Sonnet, enter claude-sonnet-4-20250514. After saving, you can switch models from the top of the chat area.

Where do you manage API Keys? In the Auth tab. Here you will see the API Keys for all your Providers. You can add, edit, or delete API Keys here. PiDeck encrypts and stores API Keys locally; nothing is uploaded to any server.

Here is a quick recommendation for model selection. If you mostly write code, GPT-4o and Claude Sonnet 4 are both excellent. GPT-4o is strong at code understanding and generation. Claude Sonnet 4 stands out in long context and reasoning. If you need local models, Ollama running Llama 3 or Mistral works too, but it requires a decent GPU. My advice is: start with a cloud model to get the workflow going, then switch based on your actual needs.

After configuration, how do you verify the model works? Go back to the chat area, select the model you just added from the top, and send any message. If the AI replies normally, the model is configured correctly. If there is an error, read the error message first. Common errors include invalid API Key, wrong model name, or incorrect Provider endpoint.

Let me help you avoid two common pitfalls. First, model names must match exactly, including case and version. For example, gpt-4o and gpt-4o-mini are different models. Second, if you use a third-party API proxy, set the Provider type to Custom OpenAI Compatible, then enter the proxy endpoint. Third, if the chat area does not update after changing configuration, try restarting the Agent. Right-click the project and select Restart.

To summarize: model configuration has two layers: Provider and Model. Provider handles the API Key and endpoint. Model picks the actual brain. After configuration, switch models from the top of the chat area. If something goes wrong, check the model name and API Key first.

That is it for this episode. Models and API Keys are ready. Next episode we start having real conversations: having AI write code, fix code, and explain code. If this video helped, give it a like and a coin. Questions go in the comments. This is Cao A Yu. See you next episode.
