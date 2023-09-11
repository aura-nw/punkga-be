# How to setup google analytics

## Create google analytics

- Go to `https://analytics.google.com/analytics/web/`, create new account

- In `Account creation` section, fill `Account name` and press `Next`

  ![Alt text](imgs/image-1.png)

- In `Property creation`, fill `Property name`, choose reporting time zone to `Vietnam GMT + 7`

- Next, fill bussiness details and objectives

- Accept terms
- Choose `Web` platform and set up data stream to web

  ![Alt text](imgs/image-2.png)

- Copy `Measurement ID` in web stream detail

  ![Alt text](imgs/image-3.png)

## Create google tag manager

- Go to `https://tagmanager.google.com/`, create new account

  ![Fill infomation, choose `Web` platform](imgs/image.png)

- Create new `Tag` with `Measurement ID` of `google analytics`

  ![Alt text](imgs/image-4.png)

- Submit change

- Install `Google Tag Manager` in website

  ![Alt text](imgs/image-5.png)

## Use Google Analytics API

1. Go to `https://console.cloud.google.com/`, create new `Project` or select existing project

    ![Alt text](imgs/image-6.png)

2. Enable `Google Analytics Data API`

- Search `Google Analytics Data API`, go to this product details

  ![Alt text](imgs/image-7.png)

- Press `Enable`

  ![Alt text](imgs/image-8.png)

- Click `Credentials` in left panel. Create new or download existing service account credential

  ![Alt text](imgs/image-9.png)

3. Create service account (if not exist)

- Create new service account, no need to provide any permission

  ![Alt text](imgs/image-10.png)

- Add service account key, save to computer

  ![Alt text](imgs/image-11.png)

4. Use `https://www.npmjs.com/package/@google-analytics/data` package in NodeJS app
