module.exports = function(RED) {
  function SpeedportconfigNode(n) {
      RED.nodes.createNode(this,n);
      this.host = n.host;
      this.password = n.password;
  }
  RED.nodes.registerType("speedport-config",SpeedportconfigNode);
}