const { marked } = require('marked');
const { gfmHeadingId } = require("marked-gfm-heading-id")

marked.use(gfmHeadingId({}))

hexo.extend.renderer.register("md", "html", function (data, options) {
    return marked.parse(data.text)
}, true);

hexo.extend.helper.register('get_title_html', function (blog_title) {
    return marked.parse("# " + blog_title)
})