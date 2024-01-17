const Photo = require('../models/photo.model');
const Voter = require('../models/Voter.model');
const sanitizeHtml = require('sanitize-html');
const ipRequest = require('request-ip');

/****** SUBMIT PHOTO ********/

exports.add = async (req, res) => {
	try {
		const { title, author, email } = req.fields;
		const file = req.files.file;

		const cleanTitle = sanitizeHtml(title, {
			allowedTags: [],
			allowedAttributes: {},
		});
		const cleanAuthor = sanitizeHtml(author, {
			allowedTags: [],
			allowedAttributes: {},
		});

		const titleLength = cleanTitle.length <= 25;
		const authorLength = cleanAuthor.length <= 50;

		const emailRegex = /^([a-zA-Z0-9\.]+)@([a-z]+\.[a-z]{2,3}(\.[a-z]{2})?)$/;

		if (
			title &&
			author &&
			emailRegex.test(email) &&
			file &&
			titleLength &&
			authorLength
		) {
			// if fields are not empty...

			const fileName = file.path.split('/').slice(-1)[0]; // cut only filename from full path, e.g. C:/test/abc.jpg -> abc.jpg

			const fileExt = fileName.split('.').slice(-1)[0];
			if (fileExt !== 'jpg' && fileExt !== 'png' && fileExt !== 'gif') {
				throw new Error('Wrong file');
			} else {
				const newPhoto = new Photo({
					title: cleanTitle,
					author: cleanAuthor,
					email,
					src: fileName,
					votes: 0,
				});
				await newPhoto.save(); // ...save new photo in DB
				res.json(newPhoto);
			}
		} else {
			throw new Error('Wrong input!');
		}
	} catch (err) {
		res.status(500).json(err);
	}
};

/****** LOAD ALL PHOTOS ********/

exports.loadAll = async (req, res) => {
	try {
		res.json(await Photo.find());
	} catch (err) {
		res.status(500).json(err);
	}
};

/****** VOTE FOR PHOTO ********/

exports.vote = async (req, res) => {
	try {
		const clientIP = ipRequest.getClientIp(req);
		let voter = await Voter.findOne({ user: clientIP });

		if (!voter) {
			voter = new Voter({ user: clientIP, votes: [req.params.id] });
		} else if (voter.votes.includes(req.params.id)) {
			return res
				.status(500)
				.json({ message: 'User have already voted for this photo' });
		} else {
			voter.votes.push(req.params.id);
		}

		await voter.save();

		const photoToUpdate = await Photo.findOne({ _id: req.params.id });
		if (!photoToUpdate) {
			return res.status(404).json({ message: 'Not found' });
		}

		photoToUpdate.votes++;
		await photoToUpdate.save();
		res.send({ message: 'OK' });
	} catch (err) {
		res.status(500).json(err);
	}
};
