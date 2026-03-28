import * as core from '@actions/core'
import FormData from 'form-data'
import {baseURL} from './util'
import {resolve} from 'path'
import {createReadStream} from 'fs'
import axios from 'axios'
import {CreatedVersionDetails, InitialUploadDetails, UploadDetails} from './types.d'

export async function createUpload(
  xpiPath: string,
  token: string
): Promise<InitialUploadDetails> {
  const url = `${baseURL}/addons/upload/`
  const body = new FormData()

  core.debug(`Uploading ${xpiPath}`)
  body.append('upload', createReadStream(resolve(xpiPath)))
  body.append('channel', 'listed')

  const response = await axios.post(url, body, {
    headers: {
      ...body.getHeaders(),
      Authorization: `JWT ${token}`
    }
  })
  core.debug(`Create upload response: ${JSON.stringify(response.data)}`)
  return response.data
}

export async function tryUpdateExtension(
  guid: string,
  uuid: string,
  token: string,
  approvalNotes?: string,
  srcPath?: string
): Promise<boolean> {
  const details = await getUploadDetails(uuid, token)
  if (!details.processed) {
    return false
  }

  if (!details.valid) {
    throw new Error('Extension validation failed')
  }

  const versionDetails = await createVersion(guid, uuid, token, approvalNotes)

  if (srcPath) {
    await uploadSource(guid, versionDetails.id, srcPath, token)
  }

  return true
}

export async function createVersion(
  guid: string,
  uuid: string,
  token: string,
  approvalNotes?: string
): Promise<CreatedVersionDetails> {
  const url = `${baseURL}/addons/addon/${guid}/versions/`
  const body: {upload: string; approval_notes?: string} = {
    upload: uuid
  }

  if (approvalNotes) {
    body.approval_notes = approvalNotes
  }

  core.debug(`Creating version for extension ${guid} with ${uuid}`)
  const response = await axios.post(url, body, {
    headers: {
      Authorization: `JWT ${token}`,
      'Content-Type': 'application/json'
    }
  })
  core.debug(`Create version response: ${JSON.stringify(response.data)}`)
  return response.data
}

export async function uploadSource(
  guid: string,
  versionId: number,
  srcPath: string,
  token: string
): Promise<void> {
  const url = `${baseURL}/addons/addon/${guid}/versions/${versionId}/`
  const body = new FormData()

  core.debug(`Uploading ${srcPath}`)
  body.append('source', createReadStream(resolve(srcPath)))

  const response = await axios.patch(url, body, {
    headers: {
      ...body.getHeaders(),
      Authorization: `JWT ${token}`
    }
  })
  core.debug(`Upload source response: ${JSON.stringify(response.data)}`)
}

export async function getUploadDetails(
  uuid: string,
  token: string
): Promise<UploadDetails> {
  const url = `${baseURL}/addons/upload/${uuid}/`
  const response = await axios.get(url, {
    headers: {
      Authorization: `JWT ${token}`
    }
  })
  core.debug(
    `Get upload details probe response: ${JSON.stringify(response.data)}`
  )
  return response.data
}
