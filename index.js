/*!
 * koa-better-router <https://github.com/tunnckoCore/koa-better-router>
 *
 * Copyright (c) 2016 Charlike Mike Reagent <@tunnckoCore> (http://www.tunnckocore.tk)
 * Released under the MIT license.
 */

'use strict'

let utils = require('./utils')

/**
 * > Initialize `KoaBetterRouter` with optional `options`
 * which are directtly passed to `path-match` and in
 * addition we have two more `legacy` and `prefix`.
 *
 * **Example**
 *
 * ```js
 * let router = require('koa-better-router')
 * let api = router({ prefix: '/api' }).loadMethods()
 *
 * api.get('/', (ctx, next) => {
 *   ctx.body = `Hello world! Prefix: ${ctx.route.prefix}`
 *   return next()
 * })
 *
 * // can use generator middlewares
 * api.get('/foobar', function * (next) {
 *   this.body = `Foo Bar Baz! ${ctx.route.prefix}`
 *   yield next
 * })
 *
 * let Koa = require('koa') // Koa v2
 * let app = new Koa()
 *
 * app.use(api.middleware())
 * app.use(api.middleware({ prefix: '/' }))
 *
 * app.listen(4444, () => {
 *   console.log('Try out /, /foobar, /api/foobar and /api')
 * })
 * ```
 *
 * @param {Object} `[options]` options passed to [path-match][] directly
 * @api public
 */

function KoaBetterRouter (options) {
  if (!(this instanceof KoaBetterRouter)) {
    return new KoaBetterRouter(options)
  }

  this.options = utils.extend({ prefix: '/' }, options)
  this.route = utils.pathMatch(this.options)
  this.routes = []
}

/**
 * > Load the HTTP verbs as methods on instance. If you
 * not "load" them you can just use `.addRoute` method.
 * If you "load" them, you will have method for each item
 * on [methods][] array - such as `.get`, `.post`, `.put` etc.
 *
 * **Example**
 *
 * ```js
 * let router = require('koa-better-router')()
 *
 * // all are `undefined` if you
 * // don't `.loadMethods` them
 * console.log(router.get)
 * console.log(router.post)
 * console.log(router.put)
 * console.log(router.del)
 * console.log(router.addRoute) // => function
 * console.log(router.middleware) // => function
 * console.log(router.legacyMiddleware) // => function
 *
 * router.loadMethods()
 *
 * console.log(router.get)  // => function
 * console.log(router.post) // => function
 * console.log(router.put)  // => function
 * console.log(router.del)  // => function
 * ```
 *
 * @return {KoaBetterRouter} `this` instance for chaining
 * @api public
 */

KoaBetterRouter.prototype.loadMethods = function loadMethods () {
  utils.methods.forEach(function (method) {
    let METHOD = method.toUpperCase()
    KoaBetterRouter.prototype[method] =
    KoaBetterRouter.prototype[METHOD] = function httpVerbMethod () {
      let args = [].slice.call(arguments)
      return this.addRoute.apply(this, [METHOD].concat(args))
    }
  })
  KoaBetterRouter.prototype.del = KoaBetterRouter.prototype['delete']
  return this
}

/**
 * > Powerful method to add `route` if you don't want
 * to populate you router instance with dozens of methods.
 * The `method` can be just HTTP verb or `method`
 * plus `route` something like `'GET /users'`.
 * Both modern and generators middlewares can be given too,
 * and can be combined too. **Adds routes to `this.routes` array**.
 *
 * **Example**
 *
 * ```js
 * let router = require('koa-better-router')()
 *
 * // any number of middlewares can be given
 * // both modern and generator middlewares will work
 * router.addRoute('GET /users',
 *   (ctx, next) => {
 *     ctx.body = `first ${ctx.route.path};`
 *     return next()
 *   },
 *   function * (next) {
 *     this.body = `${this.body} prefix is ${this.route.prefix};`
 *     yield next
 *   },
 *   (ctx, next) => {
 *     ctx.body = `${ctx.body} and third middleware!`
 *     return next()
 *   }
 * )
 *
 * // You can middlewares as array too
 * router.addRoute('GET', '/users/:user', [
 *   (ctx, next) => {
 *     ctx.body = `GET /users/${ctx.params.user}`
 *     console.log(ctx.route)
 *     return next()
 *   },
 *   function * (next) {
 *     this.body = `${this.body}, prefix is: ${this.route.prefix}`
 *     yield next
 *   }
 * ])
 *
 * // can use `koa@1` and `koa@2`, both works
 * let Koa = require('koa')
 * let app = new Koa()
 *
 * app.use(router.middleware())
 * app.listen(4290, () => {
 *   console.log('Koa server start listening on port 4290')
 * })
 * ```
 *
 * @param {String} `<method>` http verb or `'GET /users'`
 * @param {String|Function} `[route]` for what `ctx.path` handler to be called
 * @param {Function} `...fns` can be array or single function, any number of
 *                            arguments after `route` can be given too
 * @return {KoaBetterRouter} `this` instance for chaining
 * @api public
 */

KoaBetterRouter.prototype.addRoute = function addRoute (method, route, fns) {
  let routeObject = this.createRoute.apply(this, arguments)
  this.routes.push(routeObject)
  return this
}

/**
 * > Just creates route object without adding it to `this.routes` array.
 *
 * **Example**
 *
 * ```js
 * let router = require('koa-better-router')({ prefix: '/api' })
 * let route = router.createRoute('GET', '/users', [
 *   function (ctx, next) {},
 *   function (ctx, next) {},
 *   function (ctx, next) {},
 * ])
 *
 * console.log(route)
 * // => {
 * //   prefix: '/api',
 * //   route: '/users',
 * //   pathname: '/users',
 * //   path: '/api/users',
 * //   match: matcher function against `route.path`
 * //   method: 'GET',
 * //   middlewares: array of middlewares for this route
 * // }
 *
 * console.log(route.match('/foobar'))    // => false
 * console.log(route.match('/users'))     // => false
 * console.log(route.match('/api/users')) // => true
 * console.log(route.middlewares.length)  // => 3
 * ```
 *
 * @param {String} `<method>` http verb or `'GET /users'`
 * @param {String|Function} `[route]` for what `ctx.path` handler to be called
 * @param {Function} `...fns` can be array or single function, any number of
 *                            arguments after `route` can be given too
 * @return {Object} plain `route` object with useful properties
 * @api public
 */

KoaBetterRouter.prototype.createRoute = function createRoute (method, route, fns) {
  let args = [].slice.call(arguments, 3)
  let middlewares = utils.arrayify(fns).concat(args)

  if (typeof method !== 'string') {
    throw new TypeError('.createRoute: expect `method` to be a string')
  }

  let parts = method.split(' ')
  method = parts[0] || 'get'
  method = method.toUpperCase()

  if (typeof route === 'function') {
    middlewares = [route].concat(middlewares)
    route = parts[1]
  }
  if (Array.isArray(route)) {
    middlewares = route.concat(middlewares)
    route = parts[1]
  }
  if (typeof route !== 'string') {
    throw new TypeError('.createRoute: expect `route` be string, array or function')
  }

  let prefixed = utils.createPrefix(this.options.prefix, route)
  return {
    prefix: this.options.prefix,
    path: prefixed,
    pathname: route,
    route: route,
    match: this.route(prefixed),
    method: method,
    middlewares: middlewares
  }
}

/**
 * > Active all routes that are defined. You can pass `opts`
 * to pass different `prefix` for your routes. So you can
 * have multiple prefixes with multiple routes using just
 * one single router. You can also use multiple router instances.
 * Pass `legacy: true` to `opts` and you will get generator function
 * that can be used in Koa v1.
 *
 * **Example**
 *
 * ```js
 * let Router = require('koa-better-router')
 * let api = new Router({ prefix: '/api' })
 * let router = Router({ legacy: true })
 *
 * router.loadMethods().get('GET /',
 *   (ctx, next) => {
 *     ctx.body = 'Hello world!'
 *     return next()
 *   },
 *   (ctx, next) => {
 *     ctx.body = `${ctx.body} Try out /api/users and /foo/users`
 *     return next()
 *   })
 *
 * api.loadMethods()
 * api.get('/users', function * (next) {
 *   this.body = `Prefix: ${this.route.prefix}, path: ${this.route.pathname}`
 *   yield next
 * })
 *
 * let app = require('koa')() // koa v1
 *
 * // no need to pass `legacy`, because of the constructor options
 * app.use(router.middleware())
 *
 * // initialize `api` router with `legacy true`,
 * // because we don't have legacy defined in api router constructor
 * app.use(api.middleware(true))
 * app.use(api.middleware({ legacy: true, prefix: '/foo' }))
 *
 * app.listen(4321, () => {
 *   console.log('Legacy Koa v1 server is started on port 4321')
 * })
 * ```
 *
 * @param  {Object|Boolean} `[opts]` optional, safely merged with options from constructor,
 *   if you pass boolean true, it understands it as `opts.legacy`
 * @return {GeneratorFunction|Function} by default modern [koa][] middleware
 *   function, but if you pass `opts.legacy: true` it will return generator function
 * @api public
 */

KoaBetterRouter.prototype.middleware = function middleware (opts) {
  opts = typeof opts === 'object'
    ? utils.extend({ legacy: false }, opts)
    : { legacy: opts }
  opts.legacy = typeof opts.legacy === 'boolean'
    ? opts.legacy
    : false

  // allows multiple prefixes
  // on one router
  let options = utils.extend({}, this.options, opts)
  this.options = options

  return this.options.legacy
    ? this.legacyMiddleware()
    : (ctx, next) => {
      for (const route of this.routes) {
        if (ctx.method !== route.method) {
          continue
        }
        if (options.prefix !== route.prefix) {
          let prefixed = utils.createPrefix(options.prefix, route.pathname)
          route.prefix = options.prefix
          route.path = prefixed
          route.match = this.route(prefixed)
        }

        // - if there's a match and no params it will be empty object!
        // - if there are some params they will be here
        // - if path not match it will be boolean `false`
        let match = route.match(ctx.path, ctx.params)
        if (!match) {
          continue
        }

        route.params = match
        route.middlewares = route.middlewares.map((fn) => {
          return utils.isGenerator(fn) ? utils.convert(fn) : fn
        })

        // may be useful for the user
        ctx.route = route
        ctx.params = route.params

        // calls next middleware on success
        // returns rejected promises on error
        return utils.compose(route.middlewares)(ctx).then(() => next())
      }
      // called when request path not found on routes
      // ensure calling next middleware which is after the router
      return next()
    }
}

/**
 * > Converts the modern middleware routes to generator functions
 * using [koa-convert][].back under the hood. It is sugar for
 * the `.middleware(true)` or `.middleware({ legacy: true })`
 *
 * **Example**
 *
 * ```js
 * let app = require('koa') // koa v1.x
 * let router = require('koa-better-router')()
 *
 * router.addRoute('GET', '/users', function * (next) {
 *   this.body = 'Legacy KOA!'
 *   yield next
 * })
 *
 * app.use(router.legacyMiddleware())
 * app.listen(3333, () => {
 *   console.log('Open http://localhost:3333/users')
 * })
 * ```
 *
 * @return {Function|GeneratorFunction}
 * @api public
 */

KoaBetterRouter.prototype.legacyMiddleware = function legacyMiddleware () {
  return utils.convert.back(this.middleware())
}

/**
 * Expose `KoaBetterRouter` constructor
 *
 * @type {Function}
 * @api private
 */

module.exports = KoaBetterRouter
