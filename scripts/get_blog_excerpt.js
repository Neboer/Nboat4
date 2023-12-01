function get_first_notation(blog_markdown_content) {
    lines = blog_markdown_content.split("\n")
    for (let line of lines) {
        let trimed_line = line.trim()
        if (trimed_line[0] == ">") {
            return trimed_line.substring(1).trim()
        }
    }
}

hexo.extend.helper.register('get_first_notation', function (blog) {
    return get_first_notation(blog.raw)
})

// please pass site.posts[x] into the func, it will return a info object for the blog list.
hexo.extend.helper.register('get_blog_info', function (blog) {
    return {
        created_date: this.date(blog.date),
        updated_date: this.date(blog.updated),
        title: blog.title,
        discription: get_first_notation(blog.raw),
        small_cover: blog.small_cover,
        tags: blog.tags,
        url: this.url_for(blog.path),
        mark: parseInt(blog.mark),
        len: blog._content.length
    }
});