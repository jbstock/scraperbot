const puppeteer = require('puppeteer');
const nodemailer = require('nodemailer');
require('dotenv').config();

const scrape = async (numStories, baseURL, subURLs) => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--disable-setuid-sandbox'],
      ignoreHTTPSErrors: true,
    });
  } catch (err) {
    console.error(err);
  }
  let page = await browser.newPage();

  let allTitles = [];
  let allURLs = [];
  let stories = [];

  for (url in subURLs) {
    await page.goto(`${baseURL}/${subURLs[url]}`);
    console.log(`navigated to ${baseURL}/${subURLs[url]}`);

    await page.waitForSelector('.entity-body');

    let urls = await page.$$eval('a.news', (links) => {
      links = links.map((el) => el.href);

      return links;
    });

    let titles = await page.$$eval('.article-title', (links) => {
      links = links.map((el) => el.innerHTML);
      return links;
    });

    urls = urls.slice(0, numStories);
    titles = titles.slice(0, numStories);

    allTitles.push(titles);
    allURLs.push(urls);
  }

  allTitles = allTitles.flat();
  allURLs = allURLs.flat();

  if (allTitles.length === allURLs.length) {
    let x = allTitles.map((el, i) => {
      return [allTitles[i], allURLs[i]];
    });
    stories = x;
  }

  await browser.close();

  return stories;
};

const formatForEmail = (data, numStories, urls) => {
  let formatted = '';
  let heading = 0;
  data.map((story, i) => {
    if (i === 0 || i % numStories === 0) {
      formatted += `<h2>${urls[heading]}</h2>`;
      heading++;
    }
    formatted += `<a href='${story[1]}'>${story[0]}</a><br/><br/>`;
  }, numStories);
  return formatted;
};

const sendEmail = async (emailData) => {
  let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SENDEMAIL,
      pass: process.env.SENDPASSWORD,
    },
  });

  let mailOptions = {
    from: process.env.SENDMAIL,
    to: process.env.MYEMAIL,
    subject: "Today's Top Stories",
    html: emailData,
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
};

const numStories = 5;
const baseURL = 'https://foxsports.com';
const subURLs = ['nfl', 'mlb', 'college-football', 'winter-olympics'];

(async () => {
  const data = await scrape(numStories, baseURL, subURLs);
  const formatted = formatForEmail(data, numStories, subURLs);
  await sendEmail(formatted);
})();
