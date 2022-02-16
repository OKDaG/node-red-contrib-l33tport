node-red-contrib-l33tport
======

node-red module based on l33tport from Thomas Mellenthin (https://github.com/melle/l33tport)

to get the data as json from the speedport hybrid at the output of the node just
send one of the following keywords as text in the msg.payload to the input of the node

* **dsl**              DSL connection status and line information
* **interfaces**       Network interfaces
* **arp**              ARP table
* **session**          PPPoE Session
* **dhcp_client**      DHCP client
* **dhcp_server**      DHCP server, includes DHCP leases 
* **ipv6**             IPv6 Router Advertisement
* **dns**              DNS server and cache information
* **routing**          Routing table
* **igmp_proxy**       IGMP Proxy
* **igmp_snooping**    IGMP Snooping Table
* **wlan**             WLAN status and information
* **module**           Software version information
* **memory**           Memory and CPU utilization
* **speed**            Speed dial
* **webdav**           WebDAV URL
* **bonding_client**   Bonding HA client
* **bonding_tunnel**   Bonding tunnel
* **filterlist**       Filter list table
* **bonding_tr181**    Bonding TR-181
* **lteinfo**          LTE information
* **Status**           Systeminformation (no login needed)
* **SecureStatus**     Secure system information (login needed)
* **Overview**         General status information, i.e. tunnel status
* **modules**
* **Abuse**            trusted SMTP servers configuration
* **DECTStation**      DECT configuration
* **hsdelmobil**       DECT handset status
* **LAN**              LAN status (DHCP assigned IPs ect.)