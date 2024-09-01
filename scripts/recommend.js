hexo.extend.helper.register('calculate_recommend_list', function (all_posts) {
    let all_blogs = structuredClone(all_posts.filter(p => p.type === "blog").map(p => ({ title: p.title, mark: p.mark, path: p.path })))
    let sorted_blogs = all_blogs.sort((a_blog, b_blog) => b_blog.mark - a_blog.mark)
    return sorted_blogs.slice(0, 10)
})
