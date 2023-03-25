# ssl_store_fetcher

Should've named it `simple_ssl_store` or something.

A simple express.js app for serving SSL certificates for use with Caddy's `get_certificate http` sub-directive.

## Usage

  - Make sure you have:
      * node.js (Version 18.10 or above) installed.
      * Your SSL certificate's public key is PEM encoded and is in a file that has the `.pem` extension (if you are using a full chain file, make sure that your cert is at first, intermediate cert at second and root cert at third order).
      * Your SSL certificate's private key is PEM encoded and is in a file that has the same name as your public key _but_ with the `.key` extension.

  1. Clone the project.
  2. Run `npm i` inside the project directory.
  3. Put your certificate files inside the `certificates` directory.
  4. Run the `index.js` file. (With `node index.js` or whatever favourite method you use for daemonizing node.js apps etc.)
  5. Integrate the server's port (by default it is `9183`) to your Caddy config, an example is like below:
    
    {
    	# looks like get_certificate only works when auto_https is off
    	# i haven't done a thorough research on this.
    	auto_https off
    }
    
    https://test.example.com {
    	tls {
    		get_certificate http http://localhost:9183/certs
    	}
    }
    

  - The app has the capability of live-updating the in-memory certificate store as it always watches the `certificates` directory.
