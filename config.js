module.exports = function(RED) {
  function SpeedportConfig(n) {
    RED.nodes.createNode(this,n);
    var node = this;
    node.host = n.host;

    if(!node.host) return;

  }

  RED.nodes.registerType("speedport-config",SpeedportConfig,{
		credentials: {
			password: {type: "password"}
		}
	});
}