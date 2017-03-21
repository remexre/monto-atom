EventEmitter = require("events").EventEmitter
fs = require "fs"
languages = require "./languages"
{extname} = require "path"
zmq = require "zeromq"

class Monto extends EventEmitter
  decoder: new TextDecoder
  ee: new EventEmitter
  inSock: null
  outSock: null
  inSockAddr: null
  outSockAddr: null
  versions: {}

  constructor: (@inSockAddr = "tcp://127.0.0.1:5001", @outSockAddr = "tcp://127.0.0.1:5000") ->
    @inSock = zmq.socket("pair")
    @inSock.connect(@inSockAddr)
    @outSock = zmq.socket("pair")
    @outSock.connect(@outSockAddr)

    @inSock.on "message", (msg) =>
      {tag, contents} = JSON.parse @decoder.decode msg
      @ee.emit tag, contents

  destroy: ->
    @inSock.disconnect(@inSockAddr)
    @outSock.disconnect(@outSockAddr)

  lint: (path) ->
    @sendFile path
    @waitFor (msg) -> msg.source.physical_name == path

  sendFile: (path) ->
    ext = extname path
    lang = if ext of languages then languages[ext] else ""
    version = if path of @versions then @versions[path] else -1
    version++
    @versions[path] = version
    fs.readFile path, encoding: "utf8", (err, src) =>
      if err?
        throw err
      @sendObject
        tag: "source"
        contents:
          source:
            physical_name: path
          id: version
          language: lang
          contents: src
  sendObject: (obj) ->
    @outSock.send JSON.stringify obj
  waitFor: (pred) ->
    new Promise (resolve, reject) =>
      listener = (msg) =>
        if pred msg
          @ee.removeListener "product", listener
          resolve msg
      handle = @ee.on "product", listener


module.exports = Monto
