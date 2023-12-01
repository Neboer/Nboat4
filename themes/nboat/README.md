# Lous

[![license](https://img.shields.io/github/license/liuxiaotian/hexo-theme-lous)](https://github.com/liuxiaotian/hexo-theme-lous/blob/main/LICENSE)
[![hexo-version](https://img.shields.io/badge/hexo-5.0+-0E83CD?logo=hexo)](https://hexo.io/)
[![node-version](https://img.shields.io/badge/node-10.13+-339933?logo=node.js)](https://nodejs.org/en/)
[![prs-welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?logo=github)](https://github.com/liuxiaotian/hexo-theme-lous/pulls)

Lous, a minimalist theme for Hexo. Its' name comes from a chinese poem written by Liu Yuxi.

<p align="center">⌈斯是陋室，惟吾德馨⌋</p>

The sentence means that though the house is shabby, my virtue makes it shining.

You can see the preview [here](https://liuxiaotian.com).

## Installation

You can install it via git:

``` bash
$ git clone https://github.com/liuxiaotian/hexo-theme-lous themes/lous
```

## Configuration

Create a `_config.lous.yml` in the root directory of your hexo site.

``` yml
favicon: images/avatar.png

menu:
  Home: /
  About: about

copyright:
  name: yourname

license:
  name: CC-BY-NC-SA 4.0
  url: https://creativecommons.org/licenses/by-nc-sa/4.0/

rss:
  path: atom.xml

mathjax:
  enable: false

katex:
  enable: true

utterances:
  enable: true
  repo: owner/repo
  issueTerm: pathname
  theme: github-light

analytics:
  enable: true
  gtag: G-XXXXXXXXXXXX
```

### RSS

RSS need to install plugin `hexo-generator-feed`, please refer to [hexo-generator-feed](https://github.com/hexojs/hexo-generator-feed).

### Comment

Use [utterances](https://utteranc.es/) as the comment system.

### Highlight

Enable it in `_config.yml`:

``` yml
highlight:
  enable: true
  line_number: false
  auto_detect: false
  tab_replace: ''
  wrap: false
  hljs: true
```
