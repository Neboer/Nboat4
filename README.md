# Nboat4

这个项目是[Nboat4](https://www.neboer.site)的所有源代码，可以直接克隆本仓库来构建Nboat4网站。此源代码与网站源代码完全一致。

## 技术栈

Nboat4，作为Neboer开发的最新的博客网站，采用了目前最流行的[hexo](https://hexo.io/)框架进行开发。hexo框架性能强，生成速度快，可扩展性高，功能丰富，对原生markdown支持性好，非常适合用来开发一个个人博客。

在前端，Nboat4使用[stylus](https://stylus-lang.com/)编写CSS代码，使用[bootstrap 5](https://getbootstrap.com/)作为网站的基本前端框架，代码使用[highlightjs](https://highlightjs.org/)提供的默认高亮方案展示。Nboat4在开发中大量使用flexbox布局，支持多宽度响应式显示，阅读博文的页面支持随滑动更新的页面导航菜单，在手机、平板和电脑等不同宽度的设备上都拥有非常不错的显示效果。未来会考虑进一步支持夜间模式，和更多实用的前端效果。

后端，Nboat4采用hexo作为SSG框架，直接生成全静态网站，无论是迁移还是部署都非常方便。markdown使用[marked](https://github.com/markedjs/marked)渲染，速度快，效果好，并且绕开了hexo自带的markdown渲染器的各种问题，同时配合GitHub风格的标题ID生成，可以做到导航菜单的自动更新。同时Nboat4采用hexo原生的分页方法，更合理的生成多页站点。

## 开发与部署

按照教程安装好hexo，然后使用`hexo server`启动开发服务器，使用`hexo build`构建博客网站。

## 可配置性

Nboat4目前可配置性非常少，因为它只是用来制作某个特定网站的。当然如果你未来也想使用此框架制作属于自己的网站，可以扩展其功能。

## 主题实现

Nboat4使用的主题，叫做nboat主题。主题与博客网站本身高度相关，几乎不可能单独使用。所以如果想基于本源代码开发属于自己的网站，请基于整个仓库的内容进行修改。

## 支持markdown

Nboat4对渲染的markdown文档有特殊要求。

markdown的frontmatter必须包含如下信息

```yaml
title: 标题
title_url: this-is-a-url-safe-string
type: blog/bbs
date: 2023-12-02
updated: 2023-12-02
tags: 
- 一些
- 标签
categories:
- [博客所处的分类, 子分类]
small_cover: 博客在博客列表中展示的图
mark: 给博客打一个100分满分的分数。
```

博客正文必须是如下结构：

```markdown
# 博客标题（渲染时，这个标题不会渲染）
> 在博客标题下面的第一个blockquote是博客的介绍description

![](https://这个是博客的大图)
...
```

符合条件的markdown会被正确的渲染。

## 协议

本网站基于MIT协议开源，其中所有文章基于[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)协议出版。