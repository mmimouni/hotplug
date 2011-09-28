var fs = require('fs'), obj = require('obj'), uuid = require('uuid'), log4js = require('log4js'), logger = log4js.getLogger("hotplug");

var hots = {};

var DIR = null;

function copy_tmp(path, dir) {
	var tmp = dir + uuid.uuid(8, 16);
	fs.writeFileSync(tmp + '.js', fs.readFileSync(path, 'utf8'), 'utf8');
	return tmp;
}

function copy_and_load(absolute) {
	var hot = {	tmp: copy_tmp(absolute, DIR) };
	hot.req = require(hot.tmp);
	hots[absolute] = hot;
	return hot.req;
}

exports.setup = function(dir) {
	DIR = dir + "/.hot/";

	var stat = fs.lstatSync(DIR);
	if(!stat.isDirectory()) {
		fs.mkdirSync(DIR);
	}

	obj.each(fs.readdirSync(DIR), function(i, file) {
		fs.unlinkSync( DIR + file );
	});
}

exports.plug = function(absolute, load, unload) {

	if(DIR == null) {
		logger.warn("setup first");
		return null;
	}

	logger.info("plug " + absolute);

	load(	copy_and_load(absolute) );

	fs.watchFile(absolute , function(curr, prev) {
		if((curr.mtime - prev.mtime)<5000)
			return true;
		
		setTimeout(function() {

			var hot = null;

			if(obj.isdef(hots[absolute])) {
				hot = hots[absolute];
				if(obj.isdef(unload))
					unload(hot.req);
				delete hots[absolute];
			}

			if(hot!=null && obj.isdef(require.cache[ hot.tmp + ".js" ])) {
				delete require.cache[ hot.tmp + ".js" ];
			}

			if(hot!=null) {
				fs.unlinkSync( hot.tmp + ".js" );
			}

			load(	copy_and_load(absolute) );
			
		}, 800);
	});

	return hots[absolute];
}
