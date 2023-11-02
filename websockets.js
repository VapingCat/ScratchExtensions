/*
id	string	A unique ID used only by this extension. Multiple extensions cannot share the same ID. Can only use the letters a-z and 0-9 -- no uppercase letters, spaces, or special characters.
name	string	The name of the extension that appears in the toolbox.
blocks	array	A list of objects that describe the blocks in the project.

opcode	string	The name of the function that should run when this block runs. For example, if this is "hello", then the class's "hello" method will be run. Each opcode must be unique within each extension, so multiple extensions can each have a block with opcode "hello".
blockType	Scratch.BlockType.*	Determines the block's shape. Most commonly Scratch.BlockType.COMMAND, Scratch.BlockType.REPORTER, or Scratch.BlockType.BOOLEAN. See the table below for details.
text	string	The text that will appear in the editor for the block. There is a bit of special syntax here for dealing with arguments that will be discussed in the next segment.
arguments	object	Optional. Discussed in the next section.

Scratch.BlockType.COMMAND	A block that doesn't report a value	move 10 steps
Scratch.BlockType.REPORTER	A round block that reports a string or number	x position, costume name
Scratch.BlockType.BOOLEAN	A block with pointy edges that reports a boolean (true or false)	mouse down
Scratch.BlockType.HAT	A block that starts in response to events. Discussed later.	when this sprite clicked

type	Scratch.ArgumentType.*	Determines the shape of the input and what values the default text input accepts. Most commonly Scratch.ArgumentType.STRING, Scratch.ArgumentType.NUMBER, or Scratch.ArgumentType.BOOLEAN. See the table below for acceptable values. Note that this is only a suggestion and the real type may vary.
defaultValue	string	Optional. The default value in the toolbox. Only use this for inputs with a text box; not for boolean inputs.
menu	string	Discussed later.

Scratch.ArgumentType.STRING	Any text	apple, 123, true
Scratch.ArgumentType.NUMBER	Any number	123
Scratch.ArgumentType.BOOLEAN	True or false. This one is special as it tries to prevent users from dropping non-booleans into the input.	true
Scratch.ArgumentType.COLOR	A hex color code	#ff4c4c
Scratch.ArgumentType.ANGLE	A direction input. 90 means to the right. Increases counterclockwise. Same as sprite direction.	90, 180
Scratch.ArgumentType.MATRIX	A 5x5 matrix represented in binary	11101010101...
Scratch.ArgumentType.NOTE	A note on a piano keyboard.	?
Scratch.ArgumentType.IMAGE	Displays an inline image, not actually an input. Described later.	N/A
*/

(function(Scratch) {
	'use strict';

	if (!Scratch.extensions.unsandboxed) {
		throw new Error('Websockets needs to be ran in unsandboxed mode.');
	}

	var socket;
	var last = {};

	class Websockets {
		getInfo() {
			return {
				id: 'websockets',
				name: 'Websockets',
				blocks: [
					{
						opcode: 'connect',
						blockType: Scratch.BlockType.COMMAND,
						text: 'connect to [URL]',
						arguments: {
							URL: {
								type: Scratch.ArgumentType.STRING
							}
						}
					}, {
						opcode: 'send',
						blockType: Scratch.BlockType.COMMAND,
						text: 'send [TXT]',
						arguments: {
							TXT: {
								type: Scratch.ArgumentType.STRING
							}
						}
					}, {
						opcode: 'close',
						blockType: Scratch.BlockType.COMMAND,
						text: 'close',
						arguments: {}
					}, {
						opcode: 'lastValue',
						blockType: Scratch.BlockType.REPORTER,
						text: 'last [VAL]',
						arguments: {
							VAL: {
								type: Scratch.ArgumentType.STRING,
								menu: 'values'
							}
						}
					}, {
						blockType: Scratch.BlockType.EVENT,
						opcode: 'whenEvent',
						text: 'When websocket event [EVT] recieved',
						isEdgeActivated: false, // required boilerplate
						arguments: {
							EVT: {
								type: Scratch.ArgumentType.STRING,
								menu: 'events'
							}
						}
					}
				],
				menus: {
					events: {
						acceptReporters: false,
						items: [
							{
								text: 'Open',
								value: 'open'
							},
							{
								text: 'Error',
								value: 'error'
							},
							{
								text: 'Message',
								value: 'message'
							},
							{
								text: 'Close',
								value: 'close'
							}
						]
					},
					values: {
						acceptReporters: false,
						items: [
							{
								text: 'message',
								value: 'data'
							},
							{
								text: 'close reason',
								value: 'reason'
							}
						]
					}
				}
			};
		}

		connect(args) {
			if (socket) return;

			startSocket(args.URL);
		}

		send(args) {
			if (!socket) return;

			socket.send(args.TXT);
		}

		close(args) {
			if (!socket) return;

			socket.close();
			socket = null;
		}

		lastValue(args) {
			return last[args.VAL];
		}
	}

	function startSocket(url) {
		socket = new WebSocket(url);

		socket.addEventListener("open", eventListener);
		socket.addEventListener("error", eventListener);
		socket.addEventListener("message", eventListener);
		socket.addEventListener("close", eventListener);
	}

	function eventListener(event) {
		switch(event.type) {
			case "message":
				last['data'] = event.data.toString();
				break;
			case "close":
				last['reason'] = event.reason;
				break;
		}

		Scratch.vm.runtime.startHats('websockets_whenEvent', {
			EVT: event.type
		});
	}

	Scratch.extensions.register(new Websockets());
})(Scratch);