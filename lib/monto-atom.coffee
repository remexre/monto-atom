{CompositeDisposable, Range} = require "atom"
Monto = require "./monto"

module.exports =
  monto: null

  activate: (state) ->
    @monto = new Monto()
  deactivate: ->
    @monto.destroy()

  lint: (editor) ->
    buffer = editor.getBuffer()
    path = editor.getPath()
    console.log "Linting ", path
    @monto.lint(path).then ({contents}) ->
      contents.map ({description, length, level, offset}) ->
        range = new Range [0, 0], [0, length]
        range = range.translate buffer.positionForCharacterIndex offset
        console.log "range = ", range
        {
          type: level
          text: description
          range: range
          filePath: path
        }

  provideLinter: ->
    name: "Monto"
    scope: "file"
    lintsOnChange: true
    grammarScopes: ["*"]
    lint: (editor) =>
      @lint editor
