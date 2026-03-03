import { makeCrud } from 'betterspace/server'
import { schema, t, table } from 'spacetimedb/server'

const blog = table(
    { public: true },
    {
      content: t.string(),
      id: t.u32().autoInc().primaryKey(),
      title: t.string(),
      updatedAt: t.timestamp(),
      userId: t.identity()
    }
  ),
  spacetimedb = schema({ blog }),
  blogApi = makeCrud(spacetimedb, {
    fields: {
      content: t.string(),
      title: t.string()
    },
    idField: t.u32(),
    pk: tbl => tbl.id,
    table: db => db.blog,
    tableName: 'blog'
  }),
  createBlog = blogApi.exports.create_blog,
  updateBlog = blogApi.exports.update_blog,
  removeBlog = blogApi.exports.rm_blog

export { createBlog as create_blog, removeBlog as rm_blog, updateBlog as update_blog }
export default spacetimedb
