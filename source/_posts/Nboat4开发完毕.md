---
title: Nboat4开发完毕
title_url: nboat4-development-is-completed
type: blog
date: 2023-12-02
updated: 2023-12-02
tags: 
- 建站
- hexo
- SSG
- bootstrap5
categories:
- [建站]
small_cover: 
mark: 83
---

# Nboat4开发完毕

> 经过了一周的连续开发，Neboer终于把Nboat4从源码界“召唤”了出来！

大家好，这里是Neboer。新网站的开发总要伴随着一些仪式感，那么就用这篇文章来简单纪念一下这个具有历史意义的时刻。祝贺Nboat4的开发圆满成功。

## Nboat3需要新的继任者

从GitHub记录上来看，Nboat3是2021年4月27日开始开发的，其开发到目前为止，已经过去近3年的时间了。这段时间，前端技术更新换代，Chrome正式版更新到了119.0.6045；nodejs疯狂迭代更新，发布了最新的LTS版本20.10.0；Vue发布了Vue3；Nuxt出现了Nuxt3；Bootstrap发布了Bootstrap v5；[tailwindCSS](https://tailwindcss.com/)开始逐渐成为最现代的前端样式方案……而Nboat3，Neboer3是Neboer在很菜很菜的时候开发的（现在的Neboer也非常非常菜对吧），现在因为臃肿的、无用的功能；麻烦的部署；过时的nodejs引擎等等，已经很难再继续维护了。之前因为一些各种各样的原因，需要把网站在不同的服务器上迁移，迁移实在是麻烦事，因为每次都需要搬运Mongodb数据库、安装新的nodejs环境等等。之前的nuxtjs对nodejs的版本限制极为严格，我直到现在都没弄懂到底它最适合运行的nodejs版本是哪个。

最要命的是，在最近一次迁移之后，Nboat3已经无法提交新的文章和发布新的留言了，甚至连最基本的修改主页内容都难以做到。Neboer开始怀疑，是不是Nboat3出现了问题，数据库、程序，任何一个地方都不太容易debug，修复Nboat3最好的方法就是把它迁移到最新的框架上去，而迁移的难度已经完全高于从0开始开发一个新的网站了。

经过慎重考虑，Neboer决定立即开发Nboat4。

## Nboat4的框架选择

Nboat4的技术栈几乎当场就确定下来了，没有耗费任何的时间。为什么？因为它要解决的目标和痛点都太明确了。

首先就是全静态部署，这个毋庸置疑，Nboat4应该是全静态的页面，可以方便的迁移、部署。

其次使用最新的前端框架，支持响应式设计，采用最广泛、最受支持的方案来部署网站，并且可以方便的发布和修改博文。这些都代表着什么？这些代表着我们需要使用SSG——静态页面生成器。而现在广泛流行的用来渲染markdown文档的SSG，比如Vitepress之类，都缺乏很多扩展性，所做的网站高度同质化。博客网站，和普通的产品介绍网站不一样，需要很多可自定义的样式和扩展插件之类，而这些是Vitepress这种文档SSG所缺乏的。

到目前为止，我们的技术选择就非常明确了，Hugo/Hexo/Wordpress——传统、老牌、稳定支持的SSG。

而经过实际的体验，发现还是Hexo的可扩展性和解决的问题最多。Hugo和golang的高度绑定导致其扩展困难，而Wordpress，又过于古老。选择Hexo，最开始是一个“实验性实现”，没想到这个实验性的实现到最后实现得越来越顺手，终于变成了一个真正的Nboat4实现方法，被我们所采用，并且成功建站。

## Nboat4新在何处？

Nboat4是Neboer的个人主页的全新形态，它在Nboat3的*设计*基础上，进行了大量的修改、更新。它基本达到了我们之前对Nboat4的期待和要求。

- 首先，Nboat4完全使用hexo静态部署，直接解决了动态部署的所有麻烦的问题。
- Nboat4采用Bootstrap5作为组件库，对Bootstrap版本进行了更新。
- Nboat4的开发流程非常迅速，只用大概一周左右的时间便完全开发完毕，维护难度比nuxt项目低了数个数量级。
- Nboat4采用全宽度响应式设计，理论上应该能支持所有的设备显示，可以充分利用设备的显示空间，不会造成浪费。
- Nboat4默认支持代码语法高亮，很容易可以扩展对数学公式等的支持。
- Nboat4借鉴了国外知名网站[Medium](https://medium.com/)的前端设计，前端设计简洁自然。
- Nboat4抛弃无用的“大博文”概念，将数据库中的信息变成了markdown文档中frontmatter的全部内容。

- Nboat4**完全开源**，我们把网站的源代码和所有的博客全部放在了GitHub上，可以访问[github.com/Neboer/Nboat4](https://github.com/Neboer/Nboat4)获取。所有的博客更新会定期提交到仓库中，这也与Nboat3形成了区别。
- Nboat4重新对Hexo所规范的Markdown文档进行了定义——Nboat4定义了自己的“Nboat Markdown”标准，并且为此编写了Hexo的支持插件。
- Nboat4中，对网页的前端设计多了一些考虑，加入了树、海浪为主题的设计要素，并且搭配Bootstrap蓝，整体设计风格清新了不少。
- Nboat4的JavaScript代码非常少，StylusCSS和EJS的代码各占一半，是一个纯前端项目。
- Nboat4增加了博文的推荐页，用户可以直接快速访问到Neboer推荐的文章。
- Nboat4增加了博客页内标题导航（感谢Bootstrap），宽屏浏览也可以很便捷。
- Nboat4继续采用MIT协议开源，并且全站使用CC BY 4.0协议发布文章。Neboer第一次明确自己文章的使用权限。

当然，Nboat4也引入了一些不足。

- Nboat4依然没有开放评论（Neboer应该很难再开放评论了）
- Nboat4没有访问量统计、没有点赞功能。（需要额外API支持，没有做）
- Nboat4的自动化文章发布等需要编写脚本支持，不再可以方便的在网页中直接改动博客内容了。
- Nboat4引入了阿里云提供的站长统计工具，也开始追踪用户了。（对不起，终究还是活成了自己讨厌的样子）
- Nboat4依然没有开发博客历史版本的功能。
- Nboat4使用的Nboat Markdown标准中，直接指定了图片应该上传到云端，这可能引入很大的不便。
- Nboat4的开发过于仓促，可能还遗留很多问题没有解决。

## Nboat4的开发进程

其实开发一个网站最复杂和困难的地方在什么？

选择Hexo，问题并没有解决。接下来呢？我们从零开始搭建Hexo博客？用什么主题？加什么插件？需要和Nboat3的设计保持一致吗？

初来乍到，我们第一次使用Hexo，问题很多。再加上Hexo的文档写得一言难尽，过于模糊，很多东西只是浮光掠影的提一嘴，并没有做深入的探讨，这为给这个博客框架开发插件和扩展带来了很多不便之处。再加上Hexo支持并建议在markdown文档中使用`<%%>`的类EJS标记，以及大量的、hexo私自定义的markdown用法，这也让我很不爽。总之，Hexo带来的问题挺多，需要我们专门解决。

为此，为了避免在基础框架上做过多的重复工作，以及直接学习一下其他人的Hexo主题代码，我决定基于一个现有主题开始进行开发。这个主题就是[Lous](https://github.com/liuxiaotian/hexo-theme-lous)，斯是陋室，唯吾德馨——这个框架非常简单，但功能完整，是一个非常合适的Hexo起步框架。

所以我们开始了博客的开发……整个开发过程大概分为这样几个阶段

1. layout的处理，即博客整体的header/footer的开发，这里我们博客的底图，是一个叫星沙的可爱群友帮忙绘制的。

2. 博客首页的开发。这个时候我们一直在挑选博客的首页的配图。

3. menu的开发，即目录块的开发。

4. 编写Python程序，将Nboat3数据库中的所有博文和留言都迁移到Nboat4中。

   注意，Nboat4中的博文和留言本质上都是hexo概念中的posts。只不过留言并没有自己专属的标题而已。按理来说留言也是可以按博客的方法进行访问的，只不过这是不受支持的行为——在未来，会考虑编写插件屏蔽生成留言的博客浏览页，加快构建的速度，减少生成静态文件夹的大小。

5. 博客列表页的开发。这也是最复杂的一个地方。首先需要开发一个可以提取Neboer风格markdown文档的插件，放在scripts里作为helper函数让模板调用。然后再开发每个列表项的小目录块，最后再开发博客列表本身。这里需要注意响应式设计。另外我们还在博客列表的右侧添加了一个推荐阅读栏，这样最大化的利用了显示器宽屏的显示空间，还可以给我们“值得一读”的好文章更多的曝光机会（虽然本来就没什么机会就是了

   其实也就是在这里，可以是Nboat4设计的最重要的精神体现的地方——我们几乎完整的借鉴了[Medium](https://medium.com/)的博客页列表设计。这样使得我们的博客列表保留了Neboer的朴实风格的同时，又具有了Medium网站的现代和美观布局的特点，又方便又好看。下面是来自Medium上的网站截图，可以大概看出和Nboat4的博客列表有多么的相似。

   ![Medium主页](https://nboater.oss-cn-beijing.aliyuncs.com/nboat4-development-is-completed/Medium%E6%88%AA%E5%9B%BE.webp)

6. 一阶段补充响应式设计：针对站点的特点，对以上所有内容进行响应式适配。搭配bootstrap自带的断点系统，使得Nboat4在任何宽度的页面上都可以正常显示。

7. board页面的开发。这个页面实现了留言板的功能。

8. 分页。分页是非常有意思的设计。hexo对分页的支持非常友好，里面直接有hexo pagination的插件。不过这个插件本质上是一个运行库，需要搭配hexo的generator插件才能正常使用——没有关系，我们已经处理好了，还是比较简单的。博客中需要分页的主要是两个部分——一个是博客列表，一个是留言列表。分页还需要前端配合，我就直接用EJS在前端撸了一个简单的样式的分页器。其实bootstrap是有非常好的分页器的，只不过我们觉得很丑，没有使用。

9. 最后我们才开发post页面，也就是每个博客文章展示的页面。为什么呢？因为lous这个主题里已经有非常不错的post页面了，我们只是需要对其稍作修改就可以。我们将本来比较小的字号调大，然后再添加一个随用户滚动而实时更新的文章大纲——这竟然非常容易实现！因为bootstrap提供了[scrollspy](https://getbootstrap.com/docs/5.3/components/scrollspy/)功能，配合hexo生成的tos，二者可以无缝搭配，共同协作完成这个功能。

   不过这里还需要补充一下：hexo默认的markdown解析器[hexo-rendered-marked](https://github.com/hexojs/hexo-renderer-marked)所使用的 marked版本过低，我们打算将其渲染器卸载，直接使用最新的marked渲染markdown文档。不过这里有很多问题——其中最大的一个问题就是marked的高版本反而不会默认生成heading id——也就是给文章中每个不同的标题标签生成id了——而这个功能是scrollspy所必须的。所以我们特意又安装了[marked-gfm-heading-id](https://www.npmjs.com/package/marked-gfm-heading-id)，这个插件可以让marked生成GitHub风格的header id，非常方便。

10. 最后，我们继续实现主页的功能，把推荐链接放在了主页的右侧，更加醒目，然后也更加美观。bootstrap的卡片非常非常好用，用户可以直接点击跳转到任何想去的地方。

## Nboat4的未来

Nboat，这个Neboer的个人主页系列网站，一不小心已经开发了四四四四个版本了，从一开始的模板渲染，到后来的Vue/Nuxt，再回归模板渲染，采用EJS+stylus技术栈，纯前端原生实现，只能说确实走了很多弯路。这次更新使用的Bootstrap 5非常漂亮，是非常现代的组件框架。在开发Nboat4的时候，我们也尽量采用贴合框架和hexo原生功能的实现，尽量不要自己重复造轮子。不过这样对这些框架的依赖就更重一些。Bootstrap倒没什么关系，倒是希望hexo的开发者继续努力下去，把这个SSG做大做强。

hexo本身还是有无限可能的。其实我们很好奇，这么强大的框架为什么只能用在个人博客上——感觉几乎所有的信息流网站都可以用hexo架构进行开发嘛，因为结构简单，而且十分方便。感觉hexo主要的问题还是文档太老，而且信息密度很底。hexo中有很多人都在下面评论，文档写的是依托答辩（逆天。

![hexo文档下面的评论](https://nboater.oss-cn-beijing.aliyuncs.com/nboat4-development-is-completed/服了hexo文档比七牛还烂.webp)

![](https://nboater.oss-cn-beijing.aliyuncs.com/nboat4-development-is-completed/hexo%E6%96%87%E6%A1%A3%E5%BA%94%E8%AF%A5%E9%87%8D%E5%86%99%E4%BA%86.webp)

可以理解大家的怨气，不过作为开发者，不能什么事情都依赖文档，有一定的“猜想-假设-实验-证明”能力也是很重要的。一个好的项目只能说，是由很多因素共同促进的吧，希望社区可以站出来，为hexo写一份更好的文档。

Nboat4未来就绑定在hexo上了吗？我不确定，不过目前来看，既然已经有了如此优秀的前端布局，就无论Nboat4迁移到哪个平台，感觉都不会非常费劲了。毕竟，网站开发，尤其是这种创意网站开发，重点还是在于要明确自己的需求上。只有需求明确了，才能更好、更快、更准确的用代码来描述出页面的样子。前端开发的尽头，难道是产品？我不敢苟同……

不管怎么说，做出了新网站，还是很开心的。未来也会继续在上面发更多文章的，希望大家给我加个祝福！3q~