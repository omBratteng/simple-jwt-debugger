import http from "http"
import process from "node:process"

// Properly handle SIGTERM and SIGINT
process.stdin.resume()
process.on("SIGINT", () => process.exit(0))
process.on("SIGTERM", () => process.exit(0))

const jwtDecode = function (jwt) {
	function b64DecodeUnicode(str) {
		return decodeURIComponent(
			Buffer.from(str, "base64").replace(/(.)/g, function (m, p) {
				let code = p.charCodeAt(0).toString(16).toUpperCase()
				if (code.length < 2) {
					code = "0" + code
				}
				return "%" + code
			})
		)
	}
	function decode(str) {
		let output = str.replace(/-/g, "+").replace(/_/g, "/")
		switch (output.length % 4) {
			case 0:
				break
			case 2:
				output += "=="
				break
			case 3:
				output += "="
				break
			default:
				throw new Error("Illegal base64url string!")
		}

		try {
			return b64DecodeUnicode(output)
		} catch (err) {
			return atob(output)
		}
	}

	const jwtArray = jwt.split(".")

	return {
		header: JSON.parse(decode(jwtArray[0])),
		payload: JSON.parse(decode(jwtArray[1])),
		signature: decode(jwtArray[2]),
	}
}

function syntaxHighlight(json) {
	if (typeof json != "string") {
		json = JSON.stringify(json, undefined, 2)
	}

	return json
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(
			/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
			function (match) {
				let cls = "number"
				if (/^"/.test(match)) {
					if (/:$/.test(match)) {
						cls = "key"
					} else {
						cls = "string"
					}
				} else if (/true|false/.test(match)) {
					cls = "boolean"
				} else if (/null/.test(match)) {
					cls = "null"
				}
				return '<span class="' + cls + '">' + match + "</span>"
			}
		)
}

const requestListener = function (req, res) {
	// return error if req.headers.authorization is not set
	if (!req.headers.authorization) {
		res.writeHead(400)
		res.end("Authorization header is not set")
		return
	}

	res.setHeader("Content-Type", "text/html")
	res.writeHead(200)
	const jwt = jwtDecode(req.headers.authorization.split(" ")[1])
	jwt.signature = "[Signature]"
	res.end(`<html>
	<head>
		<title>oauth2-proxy AAD</title>
		<meta charset="utf-8" />
		<style>
			html {
				background: #1d1f20;
				color: #abb2bf;
			}
			.string {
				color: #98c379;
			}
			.number,
			.null,
			.boolean {
				color: #d19a66;
			}
			.key {
				color: #e06c75;
			}

			pre {
				white-space: pre-wrap;
				width: 100%;
				word-break: break-all;
			}
		</style>
	</head>
	<h1>Hei ${jwt.payload.given_name} ${jwt.payload.family_name}!</h1>
	<hr />
	<pre>${syntaxHighlight(jwt)}</pre>
	<hr />
	<h2>Authorization header:</h2>
	<pre>${req.headers.authorization}</pre>
</html>`)
}

const port = process.env.PORT || 3000
const server = http.createServer(requestListener)
console.log(`Listening on port ${port}`)
server.listen(port)
