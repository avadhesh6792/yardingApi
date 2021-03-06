var exports = module.exports = {};

var nodemailer = require("nodemailer");
let Config = require('../config/config');

exports.send_email = function({receivers, subject, body}, callback){
  let bind = {};
  let smtpConfig = {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // upgrade later with STARTTLS
      auth: {
          user: Config.smtp_user,
          pass: Config.smtp_pass
      }
  };
  let transporter = nodemailer.createTransport(smtpConfig);
  receivers = receivers.join(', ');
  let mailOptions = {
      //from: '"Fred Foo 👻" <foo@blurdybloop.com>', // sender address
      to: receivers, // list of receivers
      subject: subject, // Subject line
      //text: 'Hello world?', // plain text body
      html: body // html body
  };

  transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        bind.status = 0;
        bind.message = 'Oops! error occured while sending email';
        bind.error = error;
      } else{
        bind.status = 1;
        bind.message = 'Email was sent successfully';
        bind.data = info;
      }
      return callback(bind)
  });

}
